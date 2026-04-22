$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Assert-CommandExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$CommandName
    )

    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        throw "Required command '$CommandName' was not found in PATH."
    }
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Description,

        [Parameter(Mandatory = $true)]
        [scriptblock]$Script
    )

    Write-Host "`n[STEP] $Description" -ForegroundColor Cyan
    & $Script
    if ($LASTEXITCODE -ne 0) {
        throw "Step failed: $Description"
    }
}

function Start-PortForwardJob {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [string]$Namespace,

        [Parameter(Mandatory = $true)]
        [string]$Resource,

        [Parameter(Mandatory = $true)]
        [int]$LocalPort,

        [Parameter(Mandatory = $true)]
        [int]$RemotePort
    )

    $existingJobs = Get-Job -Name $Name -ErrorAction SilentlyContinue
    if ($existingJobs) {
        $existingJobs | Stop-Job -ErrorAction SilentlyContinue
        $existingJobs | Remove-Job -Force -ErrorAction SilentlyContinue
    }

    $job = Start-Job -Name $Name -ScriptBlock {
        param($Ns, $Res, $Lp, $Rp)
        if ([string]::IsNullOrWhiteSpace($Ns)) {
            kubectl port-forward $Res "${Lp}:${Rp}"
        }
        else {
            kubectl -n $Ns port-forward $Res "${Lp}:${Rp}"
        }
    } -ArgumentList $Namespace, $Resource, $LocalPort, $RemotePort

    return $job
}

Assert-CommandExists -CommandName "docker"
Assert-CommandExists -CommandName "kubectl"

$repoRoot = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($repoRoot)) {
    $repoRoot = (Get-Location).Path
}

$frontendDir = Join-Path $repoRoot "..\frontend-next"
$backendDir = Join-Path $repoRoot "..\backend-python"
$k8sDir = $repoRoot

if (-not (Test-Path $frontendDir)) {
    throw "Frontend directory not found: $frontendDir"
}
if (-not (Test-Path $backendDir)) {
    throw "Backend directory not found: $backendDir"
}
if (-not (Test-Path $k8sDir)) {
    throw "Kubernetes manifests directory not found: $k8sDir"
}

$yamlFiles = Get-ChildItem -Path $k8sDir -Recurse -File | Where-Object { $_.Extension -in ".yaml", ".yml" }
if (-not $yamlFiles) {
    throw "No YAML files found in: $k8sDir"
}

Invoke-Checked -Description "Build frontend image neurolex-frontend:latest" -Script {
    docker build -t neurolex-frontend:latest `
        --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyDj81cXsGnNFUDnDfqwYE4bhwJTjZNb7lc" `
        --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="neurolex-d4b5c.firebaseapp.com" `
        --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="neurolex-d4b5c" `
        --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="neurolex-d4b5c.firebasestorage.app" `
        --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="991530279296" `
        --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="1:991530279296:web:229eaae0822dca389d2165" `
        --build-arg NEXT_PUBLIC_BACKEND_URL="http://localhost:8001" `
        $frontendDir
}

Invoke-Checked -Description "Build backend image neurolex-backend:latest" -Script {
    docker build -t neurolex-backend:latest $backendDir
}

Invoke-Checked -Description "Apply all YAML files from ./k8s" -Script {
    kubectl apply -f $k8sDir
}

Invoke-Checked -Description "Wait for deployment neurolex-frontend to be ready" -Script {
    kubectl rollout status deployment/neurolex-frontend --timeout=300s
}

Invoke-Checked -Description "Wait for deployment neurolex-backend to be ready" -Script {
    kubectl rollout status deployment/neurolex-backend --timeout=300s
}

Invoke-Checked -Description "Create/ensure ServiceAccount admin-user in kubernetes-dashboard namespace" -Script {
    kubectl create serviceaccount admin-user -n kubernetes-dashboard --dry-run=client -o yaml | kubectl apply -f -
}

Invoke-Checked -Description "Create/ensure cluster-admin binding for admin-user" -Script {
    kubectl create clusterrolebinding admin-user --clusterrole=cluster-admin --serviceaccount=kubernetes-dashboard:admin-user --dry-run=client -o yaml | kubectl apply -f -
}

Write-Host "`n[STEP] Start background port-forwards" -ForegroundColor Cyan
$jobs = @(
    Start-PortForwardJob -Name "pf-neurolex-frontend" -Namespace "default" -Resource "deployment/neurolex-frontend" -LocalPort 3000 -RemotePort 3000
    Start-PortForwardJob -Name "pf-neurolex-backend" -Namespace "default" -Resource "deployment/neurolex-backend" -LocalPort 8001 -RemotePort 8001
    Start-PortForwardJob -Name "pf-k8s-dashboard" -Namespace "kubernetes-dashboard" -Resource "service/kubernetes-dashboard" -LocalPort 8443 -RemotePort 8443
)

Write-Host "Port-forward jobs started:" -ForegroundColor Green
$jobs | Select-Object Id, Name, State | Format-Table -AutoSize

Write-Host "`n[STEP] Fetch dashboard login token" -ForegroundColor Cyan
$dashboardToken = ""

try {
    $dashboardToken = kubectl -n kubernetes-dashboard create token admin-user
}
catch {
    $dashboardToken = ""
}

if ([string]::IsNullOrWhiteSpace($dashboardToken)) {
    $secretName = kubectl -n kubernetes-dashboard get serviceaccount admin-user -o jsonpath="{.secrets[0].name}"
    if (-not [string]::IsNullOrWhiteSpace($secretName)) {
        $encodedToken = kubectl -n kubernetes-dashboard get secret $secretName -o jsonpath="{.data.token}"
        if (-not [string]::IsNullOrWhiteSpace($encodedToken)) {
            $dashboardToken = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($encodedToken))
        }
    }
}

if ([string]::IsNullOrWhiteSpace($dashboardToken)) {
    Write-Warning "Could not fetch dashboard login token automatically."
}
else {
    Write-Host "`nKubernetes Dashboard Token:" -ForegroundColor Yellow
    Write-Host $dashboardToken
}

Write-Host "`nActive port-forwards:" -ForegroundColor Yellow
$runningJobs = Get-Job -Name "pf-neurolex-frontend", "pf-neurolex-backend", "pf-k8s-dashboard" -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Running" }

if (-not $runningJobs) {
    Write-Warning "No active port-forward jobs are running."
}
else {
    $jobDetails = foreach ($job in $runningJobs) {
        switch ($job.Name) {
            "pf-neurolex-frontend" {
                [pscustomobject]@{
                    Name    = $job.Name
                    JobId   = $job.Id
                    Status  = $job.State
                    Mapping = "localhost:3000 -> deployment/neurolex-frontend:3000"
                }
            }
            "pf-neurolex-backend" {
                [pscustomobject]@{
                    Name    = $job.Name
                    JobId   = $job.Id
                    Status  = $job.State
                    Mapping = "localhost:8001 -> deployment/neurolex-backend:8001"
                }
            }
            "pf-k8s-dashboard" {
                [pscustomobject]@{
                    Name    = $job.Name
                    JobId   = $job.Id
                    Status  = $job.State
                    Mapping = "localhost:8443 -> service/kubernetes-dashboard.kubernetes-dashboard:8443"
                }
            }
        }
    }

    $jobDetails | Format-Table -AutoSize
}

Write-Host "`nDone. Use 'Get-Job' to inspect jobs and 'Stop-Job -Name <job-name>' to stop a port-forward." -ForegroundColor Green
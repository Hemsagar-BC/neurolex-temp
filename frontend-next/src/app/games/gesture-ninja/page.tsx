'use client';

import { GameCanvas } from '@/components/GameCanvas';

export default function GestureNinjaPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      <div className="w-full">
        <GameCanvas />
      </div>
    </main>
  );
}

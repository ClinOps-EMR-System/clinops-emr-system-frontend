"use client";

let audioEl: HTMLAudioElement | null = null;

export function playNotificationSound() {
  if (typeof window === "undefined") return;

  if (!audioEl) {
    audioEl = new Audio("/sound.wav");
    audioEl.volume = 0.4;
  }

  audioEl.currentTime = 0;
  void audioEl.play().catch(() => {
    // Browsers block autoplay until the user has interacted with the page;
    // subsequent notifications after the first interaction will play.
  });
}

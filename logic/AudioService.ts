export class AudioService {
  private static baseAudio: HTMLAudioElement | null = null;

  private static getAudio() {
    if (!this.baseAudio) {
      this.baseAudio = new Audio("/danhco.mp3");
      this.baseAudio.preload = "auto";
    }
    return this.baseAudio;
  }

  static playMoveSound(volume = 0.3) {
    const audio = this.getAudio().cloneNode(true) as HTMLAudioElement;
    audio.volume = volume;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  static playCaptureSound(volume = 0.6) {
    this.playMoveSound(volume);
  }
}

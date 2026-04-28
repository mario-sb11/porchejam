/// <reference types="vite/client" />

interface Window {
  Spotify: any;
  onSpotifyWebPlaybackSDKReady: () => void;
}
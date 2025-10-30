import { Component, HostListener, OnInit, SecurityContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrowserQRCodeReader, ChecksumException, FormatException, NotFoundException } from '@zxing/library';
import { Gamesets } from './shared/hitster-api/gamesets.model';
import { Countries } from './shared/hitster-api/countries.model';
import { HitsterApi } from './shared/hitster-api/hitster-api';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    FormsModule,
  ],
  providers: [HitsterApi],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  loading = true;
  gamesets?: Gamesets;
  countries?: Countries;

  spotifyEmbedUrl: SafeUrl;

  spotifyPlaybackState = {
    isPaused: true,
    isBuffering: true,
    duration: 0,
    position: 0,
  };
  playbackSeekValue = 0;
  seekDragging = false;
  spotifyEmbedReady = false;
  replaySpotifyEmbedCommand: any = null;


  seekPlaybackStart() {
    this.seekDragging = true;
  }

  seekPlayback(v: number | undefined = undefined) {
    this.seekDragging = false;
    if (v === undefined) v = this.playbackSeekValue / 1000;
    if (v < 1) this.playPlaybackFromStart();
    else this.sendSpotifyEmbedCommand({ command: 'seek', timestamp: v });
    this.spotifyPlaybackState.position = this.playbackSeekValue;
    this.spotifyPlaybackState.isBuffering = true;
    // console.log('seek');
  }

  playPlaybackFromStart() {
    this.spotifyPlaybackState.position = 0;
    this.spotifyPlaybackState.isBuffering = true;
    this.playbackSeekValue = this.spotifyPlaybackState.position;
    this.sendSpotifyEmbedCommand({ command: 'play_from_start' });
  }

  togglePlayback() {
    // console.log(this.spotifyPlaybackState)
    if (this.spotifyPlaybackState.isPaused) {
      this.sendSpotifyEmbedCommand({ command: 'resume' });
    } else {
      this.sendSpotifyEmbedCommand({ command: 'pause' });
    }
  }

  sendSpotifyEmbedCommand(cmd: { command: 'play_from_start' | 'seek' | 'pause' | 'resume', [k: string]: any }) {
    if (cmd == null) return;
    if (cmd.command == 'play_from_start') {
      this.spotifyPlaybackState = {
        ...this.spotifyPlaybackState,
        isPaused: true,
        isBuffering: true,
        position: 0,
      };
    }
    if (!this.spotifyEmbedReady) {
      this.replaySpotifyEmbedCommand = cmd;
      return;
    }
    (<any>document.getElementById('spotify-embed')).contentWindow.postMessage(cmd, '*');
  }

  @HostListener('window:message', ['$event'])
  messageEvent(event: MessageEvent) {
    if (event.origin == 'https://open.spotify.com') {
      if (event.data.type == 'ready') {
        this.spotifyEmbedReady = true;
        this.spotifyPlaybackState.isBuffering = false;
        this.sendSpotifyEmbedCommand(this.replaySpotifyEmbedCommand);
        this.replaySpotifyEmbedCommand = null;
      } else if (event.data.type == 'playback_update') {
        this.spotifyPlaybackState = {
          ...this.spotifyPlaybackState,
          duration: event.data.payload.duration,
          isPaused: event.data.payload.isPaused,
          isBuffering: this.spotifyPlaybackState.isBuffering && this.spotifyPlaybackState.position == event.data.payload.position,
        };
        // TODO: is workaround for skipping position
        // if (Math.abs(this.spotifyPlaybackState.position - event.data.payload.position) < 2000) {
        //   if (!this.seekDragging && this.track_n < this.gamePlaylist.length && this.gamePlaylist[this.track_n].track_url == this.spotifyEmbedUrl) {
        //     const d = event.data.payload.position - this.spotifyPlaybackState.position;
        //     if (d > 0) this.timeListened += d;
        //   }
        //   this.spotifyPlaybackState.position = event.data.payload.position;
        // }

        if (!this.seekDragging) this.playbackSeekValue = this.spotifyPlaybackState.position;
        if (this.spotifyPlaybackState.position == this.spotifyPlaybackState.duration) this.spotifyPlaybackState.isPaused = true;
        // console.log(this.spotifyPlaybackState);
      } else {
        console.log(event);
      }
    }
  }

  constructor(
    private hitsterApi: HitsterApi,
    private sanitizer: DomSanitizer,
  ) {
    this.spotifyEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl('');
  }

  ngOnInit(): void {
    this.hitsterApi.getCountries().subscribe(countries => this.countries = countries);
    this.hitsterApi.getGameset().subscribe(gamesets => {
      this.gamesets = gamesets;
      this.gamesets.gamesets.sort((a, b) => {
        if (a.sku < b.sku) { return -1; }
        if (a.sku > b.sku) { return 1; }
        return 0;
      });
    });
    const codeReader = new BrowserQRCodeReader()
    console.log('ZXing code reader initialized')

    codeReader.getVideoInputDevices()
      .then((videoInputDevices) => {
        const selectedDeviceId = videoInputDevices[0].deviceId
        this.decodeContinuously(codeReader, selectedDeviceId);
        console.log(`Started decode from camera with id ${selectedDeviceId}`)
      })
      .catch((err) => {
        console.error(err)
      });
  }

  setSpotifyEmbedUrl(url: string): boolean {
    if (url == this.sanitizer.sanitize(SecurityContext.RESOURCE_URL,this.spotifyEmbedUrl)) return false;
    this.spotifyEmbedReady = false;
    this.spotifyPlaybackState = {
      isPaused: true,
      isBuffering: true,
      duration: 0,
      position: 0,
    };
    this.spotifyEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    return true;
  }

  decodeContinuously(codeReader: BrowserQRCodeReader, selectedDeviceId: string) {
    codeReader.decodeFromInputVideoDeviceContinuously(selectedDeviceId, 'video', (result, err) => {
      if (result) {
        // properly decoded qr code
        console.log('Found QR code!', result);
        const segments = extractSegments(result.getText());
        if (segments) {
          const country = this.countries?.countries.find(v => v.code.toLowerCase() == segments.countryCode.toLowerCase());
          if (country) {
            const gameset = this.gamesets?.gamesets.find(v => v.gameset_data.gameset_language == country.name && v.gameset_data.cards.find(c => c.CardNumber == segments.productCode));
            if (gameset) {
              const card = gameset.gameset_data.cards.find(c => c.CardNumber == segments.productCode);
              if (card) {
                if (this.setSpotifyEmbedUrl('https://open.spotify.com/embed/track/' + card.Spotify))
                  this.playPlaybackFromStart();
              }
            }
          }
        }
      }

      if (err) {
        // As long as this error belongs into one of the following categories
        // the code reader is going to continue as excepted. Any other error
        // will stop the decoding loop.
        //
        // Excepted Exceptions:
        //
        //  - NotFoundException
        //  - ChecksumException
        //  - FormatException

        if (err instanceof NotFoundException) {
          // console.log('No QR code found.')
        }

        if (err instanceof ChecksumException) {
          console.log('A code was found, but it\'s read value was not valid.')
        }

        if (err instanceof FormatException) {
          console.log('A code was found, but it was in a invalid format.')
        }
      }
    });
  }
}

interface Segments {
  countryCode: string;
  productCode: string;
}

export function extractSegments(urlString: string): Segments | null {
  let url: URL;

  try {
    // Attempt to create a URL object directly
    url = new URL(urlString);
  } catch (e) {
    // If parsing fails (usually because of missing protocol, e.g., 'www.example.com/...'),
    // prepend 'https://' and try again.
    try {
      url = new URL(`https://${urlString}`);
    } catch (e) {
      // If it still fails, the string is not a valid URL structure.
      return null;
    }
  }

  // 1. Get the pathname (e.g., '/fr-BE/12345/en/99999')
  const pathname = url.pathname;

  // 2. Split the path by '/' and filter out empty strings (the leading/trailing slashes)
  const pathSegments = pathname.split('/').filter(p => p.length > 0);

  // Check if there are at least two segments to analyze
  if (pathSegments.length < 2) {
    return null;
  }

  // 3. Extract the last two segments
  const countryCodeCandidate = pathSegments[pathSegments.length - 2]; // e.g., 'de' or 'en'
  const productCodeCandidate = pathSegments[pathSegments.length - 1]; // e.g., '00231' or '99999'

  // 4. Validate the extracted segments using focused regexes
  // Assumes 2 lowercase letters for the country code
  const countryRegex = /^[a-z]{2}$/;
  // Assumes 5 digits for the product code
  const productRegex = /^\d{5}$/;

  if (countryRegex.test(countryCodeCandidate) && productRegex.test(productCodeCandidate)) {
    return {
      countryCode: countryCodeCandidate,
      productCode: productCodeCandidate
    };
  }

  return null;
}

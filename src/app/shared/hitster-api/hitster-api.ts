import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { Countries } from './countries.model';
import { Gamesets } from './gamesets.model';

@Injectable()
export class HitsterApi {
  constructor(private http: HttpClient) {}

  getCountries(): Observable<Countries> {
    return this.http.get<Countries>(
      'https://corsproxy.io/?url=https://hitster.jumboplay.com/hitster-assets/countries.json'
    );
  }

  getGameset(): Observable<Gamesets> {
    return this.http.get<Gamesets>(
      'https://corsproxy.io/?url=https://hitster.jumboplay.com/hitster-assets/gameset_database.json'
    );
  }
}

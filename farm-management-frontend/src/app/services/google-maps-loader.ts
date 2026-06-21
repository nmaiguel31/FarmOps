import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsLoader {

  load(): Promise<void> {

    return new Promise((resolve) => {

      const existingScript =
        document.getElementById('google-maps');

      if (existingScript) {
        resolve();
        return;
      }

      const script =
        document.createElement('script');

      script.id = 'google-maps';

      script.src =
        `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places,geometry`;

      script.onload = () => resolve();

      document.body.appendChild(script);

    });

  }

}

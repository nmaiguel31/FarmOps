import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';

export interface WeatherForecastDay {
  date: string;
  condition: string;
  high: number;
  low: number;
  rainProbability: number;
  precipitation: number;
}

export interface WeatherInsights {
  temperature: number;
  humidity: number;
  windSpeed: number;
  rainProbability: number;
  precipitation: number;
  condition: string;
  forecast: WeatherForecastDay[];
}

@Injectable({
  providedIn: 'root'
})
export class WeatherService {

  private http = inject(HttpClient);
  private apiUrl = 'https://api.open-meteo.com/v1/forecast';

  getWeather(lat: number, lng: number) {

    const params = [
      `latitude=${lat}`,
      `longitude=${lng}`,
      'current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
      'daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum',
      'forecast_days=4',
      'timezone=auto'
    ].join('&');

    return this.http.get<any>(`${this.apiUrl}?${params}`)
      .pipe(
        map(response => this.normalizeWeather(response))
      );

  }

  private normalizeWeather(response: any): WeatherInsights {

    const daily = response?.daily || {};
    const current = response?.current || {};

    return {
      temperature: Number(current.temperature_2m || 0),
      humidity: Number(current.relative_humidity_2m || 0),
      windSpeed: Number(current.wind_speed_10m || 0),
      rainProbability: Number(daily.precipitation_probability_max?.[0] || 0),
      precipitation: Number(current.precipitation || daily.precipitation_sum?.[0] || 0),
      condition: this.getConditionLabel(current.weather_code),
      forecast: (daily.time || []).map((date: string, index: number) => ({
        date,
        condition: this.getConditionLabel(daily.weather_code?.[index]),
        high: Number(daily.temperature_2m_max?.[index] || 0),
        low: Number(daily.temperature_2m_min?.[index] || 0),
        rainProbability: Number(daily.precipitation_probability_max?.[index] || 0),
        precipitation: Number(daily.precipitation_sum?.[index] || 0)
      }))
    };

  }

  private getConditionLabel(code: number) {

    const weatherCode = Number(code);

    if ([0].includes(weatherCode)) {
      return 'Clear sky';
    }

    if ([1, 2, 3].includes(weatherCode)) {
      return 'Partly cloudy';
    }

    if ([45, 48].includes(weatherCode)) {
      return 'Foggy';
    }

    if ([51, 53, 55, 56, 57].includes(weatherCode)) {
      return 'Drizzle';
    }

    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) {
      return 'Rain likely';
    }

    if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
      return 'Snow';
    }

    if ([95, 96, 99].includes(weatherCode)) {
      return 'Storm risk';
    }

    return 'Weather unavailable';

  }

}

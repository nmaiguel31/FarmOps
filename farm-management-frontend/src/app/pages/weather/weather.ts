import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  NavigationEnd,
  Router,
  RouterModule
} from '@angular/router';
import { Subscription, filter } from 'rxjs';
import {
  LucideAlertTriangle,
  LucideCheckCircle2,
  LucideCloudRain,
  LucideCloudSun,
  LucideDroplet,
  LucideExternalLink,
  LucideSun,
  LucideThermometer,
  LucideUmbrella,
  LucideWind
} from '@lucide/angular';
import {
  WeatherForecastDay,
  WeatherInsights,
  WeatherService
} from '../../services/weather';
import { Farm } from '../../services/farm';
import { OperationSignal } from '../../services/operation-signal';

type WeatherRisk = {
  label: string;
  status: 'Low' | 'Moderate' | 'High';
  explanation: string;
  action: string;
  icon: string;
};

@Component({
  selector: 'app-weather',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LucideAlertTriangle,
    LucideCheckCircle2,
    LucideCloudRain,
    LucideCloudSun,
    LucideDroplet,
    LucideExternalLink,
    LucideSun,
    LucideThermometer,
    LucideUmbrella,
    LucideWind
  ],
  templateUrl: './weather.html',
  styleUrl: './weather.css'
})
export class Weather implements OnInit, OnDestroy {

  farms: any[] = [];
  selectedFarmId = '';
  selectedFarm: any = null;
  weather: WeatherInsights | null = null;
  weatherSignals: any[] = [];
  loadingFarms = true;
  loadingWeather = false;
  signalLoading = false;
  weatherError = '';

  private farmService = inject(Farm);
  private weatherService = inject(WeatherService);
  private operationSignalService = inject(OperationSignal);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private routeSubscription?: Subscription;
  private hasLoadedFarms = false;
  private farmsRequestInFlight = false;

  ngOnInit(): void {
    this.initializeWeatherPage();
    this.routeSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        if (event.urlAfterRedirects.startsWith('/weather')) {
          this.initializeWeatherPage();
        }
      });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  initializeWeatherPage() {
    if (this.farmsRequestInFlight) {
      return;
    }

    if (this.hasLoadedFarms) {
      if (this.selectedFarm && !this.loadingWeather && !this.weather) {
        this.loadWeatherForSelectedFarm();
      }
      return;
    }

    queueMicrotask(() => this.loadFarms());
  }

  loadFarms() {
    if (this.farmsRequestInFlight) {
      return;
    }

    this.farmsRequestInFlight = true;
    this.loadingFarms = true;
    this.cdr.detectChanges();

    this.farmService.getFarms().subscribe({
      next: (data: any) => {
        this.farms = Array.isArray(data) ? data : [];
        this.loadingFarms = false;
        this.farmsRequestInFlight = false;
        this.hasLoadedFarms = true;
        const firstFarmWithCoordinates =
          this.farms.find(farm => this.hasCoordinates(farm));

        if (firstFarmWithCoordinates) {
          this.selectedFarmId = firstFarmWithCoordinates._id;
          this.selectFarm();
        } else {
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error(error);
        this.farms = [];
        this.loadingFarms = false;
        this.farmsRequestInFlight = false;
        this.weatherError = 'Unable to load farms.';
        this.cdr.detectChanges();
      }
    });
  }

  selectFarm() {
    this.selectedFarm =
      this.farms.find(farm => farm._id === this.selectedFarmId) || null;
    this.weather = null;
    this.weatherSignals = [];
    this.weatherError = '';
    this.cdr.detectChanges();

    if (!this.selectedFarm) {
      return;
    }

    if (!this.hasCoordinates(this.selectedFarm)) {
      this.weatherError =
        'This farm needs saved latitude and longitude before weather can be loaded.';
      this.loadRelatedWeatherSignals();
      this.cdr.detectChanges();
      return;
    }

    this.loadWeatherForSelectedFarm();
  }

  loadWeatherForSelectedFarm() {
    if (!this.selectedFarm) {
      return;
    }

    this.loadingWeather = true;
    this.weatherError = '';
    this.cdr.detectChanges();

    this.weatherService
      .getWeather(Number(this.selectedFarm.latitude), Number(this.selectedFarm.longitude))
      .subscribe({
        next: (weather) => {
          this.weather = weather;
          this.loadingWeather = false;
          this.cdr.detectChanges();
          this.refreshWeatherSignals();
        },
        error: (error) => {
          console.error(error);
          this.weather = null;
          this.loadingWeather = false;
          this.weatherError =
            'Weather data is temporarily unavailable for this farm.';
          this.cdr.detectChanges();
          this.loadRelatedWeatherSignals();
        }
      });
  }

  refreshWeatherSignals() {
    this.signalLoading = true;
    this.cdr.detectChanges();

    this.operationSignalService.evaluateWeatherSignals().subscribe({
      next: () => this.loadRelatedWeatherSignals(),
      error: (error) => {
        console.error(error);
        this.loadRelatedWeatherSignals();
      }
    });
  }

  loadRelatedWeatherSignals() {
    if (!this.selectedFarm) {
      this.signalLoading = false;
      this.cdr.detectChanges();
      return;
    }

    this.operationSignalService.getSignals({
      status: 'Active',
      category: 'Weather',
      farm: this.selectedFarm._id
    }).subscribe({
      next: (signals: any) => {
        this.weatherSignals = Array.isArray(signals) ? signals : [];
        this.signalLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(error);
        this.weatherSignals = [];
        this.signalLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get riskLevel() {
    if (!this.weather) {
      return 'Not available';
    }

    const risks = this.weatherRisks;

    if (risks.some(risk => risk.status === 'High')) {
      return 'High';
    }

    if (risks.some(risk => risk.status === 'Moderate')) {
      return 'Moderate';
    }

    return 'Low';
  }

  get weatherRisks(): WeatherRisk[] {
    const weather = this.weather;

    if (!weather) {
      return [];
    }

    const rainWithin48Hours =
      Math.max(
        weather.rainProbability,
        ...weather.forecast.slice(0, 2).map(day => day.rainProbability || 0)
      );
    const maxTemperature =
      Math.max(weather.temperature, ...weather.forecast.map(day => day.high || 0));
    const maxWindSpeed =
      Math.max(weather.windSpeed, ...weather.forecast.map(day => day.windSpeed || 0));

    return [
      this.buildRainRisk(rainWithin48Hours),
      this.buildHeatRisk(maxTemperature),
      this.buildWindRisk(maxWindSpeed),
      this.buildDryRisk(weather.humidity, rainWithin48Hours)
    ];
  }

  get recommendations() {
    const highOrModerateRisks =
      this.weatherRisks.filter(risk => risk.status !== 'Low');

    if (!highOrModerateRisks.length) {
      return [
        {
          title: 'Continue normal operations',
          action: 'Weather conditions look stable for routine field work.'
        }
      ];
    }

    return highOrModerateRisks.map(risk => ({
      title: risk.label,
      action: risk.action
    }));
  }

  get currentWeatherIcon() {
    return this.getForecastIcon(this.weather?.condition || '');
  }

  hasCoordinates(farm: any) {
    return Number.isFinite(Number(farm?.latitude)) &&
      Number.isFinite(Number(farm?.longitude));
  }

  formatNumber(value: any, suffix = '') {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return 'Not available';
    }

    return `${Math.round(numericValue)}${suffix}`;
  }

  formatForecastDate(date: string) {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  getForecastIcon(condition: string) {
    const normalizedCondition = condition.toLowerCase();

    if (normalizedCondition.includes('rain') || normalizedCondition.includes('drizzle')) {
      return 'rain';
    }

    if (normalizedCondition.includes('storm')) {
      return 'storm';
    }

    if (normalizedCondition.includes('cloud') || normalizedCondition.includes('fog')) {
      return 'cloud';
    }

    return 'sun';
  }

  getSignalFarmName(signal: any) {
    return signal.farm?.name || this.selectedFarm?.name || 'Selected farm';
  }

  private buildRainRisk(rainProbability: number): WeatherRisk {
    if (rainProbability >= 70) {
      return {
        label: 'Rain Risk',
        status: 'High',
        explanation: 'Heavy rain is likely within the next 48 hours.',
        action: 'Delay irrigation and inspect drainage.',
        icon: 'rain'
      };
    }

    if (rainProbability >= 40) {
      return {
        label: 'Rain Risk',
        status: 'Moderate',
        explanation: 'Rain is possible soon.',
        action: 'Review irrigation timing before applying more water.',
        icon: 'rain'
      };
    }

    return {
      label: 'Rain Risk',
      status: 'Low',
      explanation: 'No major rain risk is expected.',
      action: 'Continue normal irrigation planning.',
      icon: 'rain'
    };
  }

  private buildHeatRisk(temperature: number): WeatherRisk {
    if (temperature >= 35) {
      return {
        label: 'Heat Stress Risk',
        status: 'High',
        explanation: 'High temperature may increase crop stress.',
        action: 'Monitor crop stress and irrigation needs.',
        icon: 'heat'
      };
    }

    if (temperature >= 30) {
      return {
        label: 'Heat Stress Risk',
        status: 'Moderate',
        explanation: 'Warm conditions may increase water demand.',
        action: 'Inspect sensitive crops during the hottest hours.',
        icon: 'heat'
      };
    }

    return {
      label: 'Heat Stress Risk',
      status: 'Low',
      explanation: 'Temperature is within a stable operating range.',
      action: 'Continue normal crop monitoring.',
      icon: 'heat'
    };
  }

  private buildWindRisk(windSpeed: number): WeatherRisk {
    if (windSpeed >= 40) {
      return {
        label: 'Wind Risk',
        status: 'High',
        explanation: 'Strong wind can affect spraying and field operations.',
        action: 'Avoid spraying and inspect vulnerable crops.',
        icon: 'wind'
      };
    }

    if (windSpeed >= 25) {
      return {
        label: 'Wind Risk',
        status: 'Moderate',
        explanation: 'Wind may reduce spraying accuracy.',
        action: 'Schedule spraying during calmer conditions.',
        icon: 'wind'
      };
    }

    return {
      label: 'Wind Risk',
      status: 'Low',
      explanation: 'Wind conditions are favorable for field work.',
      action: 'Continue normal operations.',
      icon: 'wind'
    };
  }

  private buildDryRisk(humidity: number, rainProbability: number): WeatherRisk {
    if (
      humidity <= 35 &&
      rainProbability <= 20
    ) {
      return {
        label: 'Dry Condition Risk',
        status: 'High',
        explanation: 'Low humidity and low rain probability may dry soils faster.',
        action: 'Review irrigation schedule.',
        icon: 'dry'
      };
    }

    if (
      humidity <= 45 &&
      rainProbability <= 30
    ) {
      return {
        label: 'Dry Condition Risk',
        status: 'Moderate',
        explanation: 'Dry conditions may develop if rainfall stays low.',
        action: 'Monitor soil moisture in active fields.',
        icon: 'dry'
      };
    }

    return {
      label: 'Dry Condition Risk',
      status: 'Low',
      explanation: 'Humidity and rain outlook are not indicating dry stress.',
      action: 'Continue routine moisture checks.',
      icon: 'dry'
    };
  }

}

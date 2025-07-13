// Jet Lag Calculator based on circadian rhythm research
// Sources: PLOS Computational Biology, Harvard Medical School research

export interface TravelDetails {
  departureTimezone: string;
  arrivalTimezone: string;
  departureTime: string;
  arrivalTime: string;
  usualBedtime: string;
  usualWakeTime: string;
}

export interface LightExposureRecommendation {
  time: string;
  action: 'seek_light' | 'avoid_light' | 'bright_light' | 'dim_light';
  description: string;
  intensity?: string;
}

export interface JetLagPlan {
  timeZonesDifference: number;
  direction: 'eastward' | 'westward';
  estimatedAdjustmentDays: number;
  preTravelDays: LightExposureRecommendation[][];
  travelDay: LightExposureRecommendation[];
  postTravelDays: LightExposureRecommendation[][];
  sleepSchedule: {
    newBedtime: string;
    newWakeTime: string;
    adjustmentPhase: string;
  };
}

export class JetLagCalculator {
  static calculateTimeZoneDifference(departure: string, arrival: string): number {
    // Simplified timezone calculation - in real app would use timezone library
    const timezones: Record<string, number> = {
      'UTC': 0, 'GMT': 0,
      'EST': -5, 'PST': -8, 'CST': -6, 'MST': -7,
      'JST': 9, 'AEST': 10, 'CET': 1, 'IST': 5.5,
      'HKT': 8, 'SGT': 8, 'CAT': 2, 'EAT': 3
    };
    
    const depOffset = timezones[departure] || 0;
    const arrOffset = timezones[arrival] || 0;
    return arrOffset - depOffset;
  }

  static calculateJetLagPlan(travel: TravelDetails): JetLagPlan {
    const timeDiff = this.calculateTimeZoneDifference(
      travel.departureTimezone, 
      travel.arrivalTimezone
    );
    
    const direction = timeDiff > 0 ? 'eastward' : 'westward';
    const timeZonesDifference = Math.abs(timeDiff);
    
    // Research shows ~1 day per timezone to fully adjust
    const estimatedAdjustmentDays = Math.ceil(timeZonesDifference * 0.8);
    
    return {
      timeZonesDifference,
      direction,
      estimatedAdjustmentDays,
      preTravelDays: this.generatePreTravelSchedule(direction, timeZonesDifference),
      travelDay: this.generateTravelDaySchedule(direction, travel),
      postTravelDays: this.generatePostTravelSchedule(direction, timeZonesDifference),
      sleepSchedule: this.calculateNewSleepSchedule(travel, timeDiff)
    };
  }

  private static generatePreTravelSchedule(
    direction: 'eastward' | 'westward', 
    timeZones: number
  ): LightExposureRecommendation[][] {
    const days = Math.min(3, timeZones); // Max 3 days pre-travel prep
    const schedule: LightExposureRecommendation[][] = [];

    for (let day = 1; day <= days; day++) {
      const daySchedule: LightExposureRecommendation[] = [];
      
      if (direction === 'eastward') {
        // Eastward: advance clock by getting morning light earlier
        daySchedule.push({
          time: `${6 + day}:00`,
          action: 'bright_light',
          description: `Get bright light exposure (10,000+ lux) - outdoor sunlight or light therapy box`,
          intensity: '10,000+ lux'
        });
        daySchedule.push({
          time: `${20 - day}:00`,
          action: 'avoid_light',
          description: 'Start dimming lights, avoid screens. Use blue light filters.'
        });
      } else {
        // Westward: delay clock by avoiding morning light, getting evening light
        daySchedule.push({
          time: '06:00',
          action: 'avoid_light',
          description: 'Keep lights dim, wear sunglasses if going outside'
        });
        daySchedule.push({
          time: `${18 + day}:00`,
          action: 'bright_light',
          description: 'Get bright light exposure in evening',
          intensity: '10,000+ lux'
        });
      }
      
      schedule.push(daySchedule);
    }

    return schedule;
  }

  private static generateTravelDaySchedule(
    direction: 'eastward' | 'westward',
    travel: TravelDetails
  ): LightExposureRecommendation[] {
    const schedule: LightExposureRecommendation[] = [];

    // Flight day recommendations based on destination timezone
    if (direction === 'eastward') {
      schedule.push({
        time: 'During flight',
        action: 'avoid_light',
        description: 'Keep cabin lights dim, wear eye mask, try to sleep if it\'s nighttime at destination'
      });
      schedule.push({
        time: 'Upon arrival morning',
        action: 'bright_light',
        description: 'Get outdoor sunlight immediately upon arrival if it\'s morning at destination',
        intensity: 'Natural sunlight'
      });
    } else {
      schedule.push({
        time: 'During flight',
        action: 'dim_light',
        description: 'Stay awake if it\'s daytime at destination, use normal cabin lighting'
      });
      schedule.push({
        time: 'Upon arrival evening',
        action: 'bright_light',
        description: 'Seek bright light if arriving in evening at destination',
        intensity: '10,000+ lux'
      });
    }

    return schedule;
  }

  private static generatePostTravelSchedule(
    direction: 'eastward' | 'westward',
    timeZones: number
  ): LightExposureRecommendation[][] {
    const days = Math.min(timeZones, 5); // Up to 5 days post-travel
    const schedule: LightExposureRecommendation[][] = [];

    for (let day = 1; day <= days; day++) {
      const daySchedule: LightExposureRecommendation[] = [];
      
      if (direction === 'eastward') {
        // Continue advancing with morning light
        daySchedule.push({
          time: '06:00',
          action: 'bright_light',
          description: 'Get morning sunlight - go outside within 30 minutes of waking',
          intensity: 'Natural sunlight'
        });
        daySchedule.push({
          time: '10:00',
          action: 'bright_light',
          description: 'Continue bright light exposure throughout morning',
          intensity: '2,500+ lux'
        });
        daySchedule.push({
          time: '19:00',
          action: 'avoid_light',
          description: 'Start dimming lights 2-3 hours before intended bedtime'
        });
      } else {
        // Continue delaying with evening light
        daySchedule.push({
          time: '07:00',
          action: 'dim_light',
          description: 'Keep morning light minimal - stay indoors or wear sunglasses'
        });
        daySchedule.push({
          time: '17:00',
          action: 'bright_light',
          description: 'Seek afternoon/evening light exposure',
          intensity: '2,500+ lux'
        });
        daySchedule.push({
          time: '20:00',
          action: 'bright_light',
          description: 'Continue bright light in evening to delay sleep',
          intensity: '10,000+ lux'
        });
      }
      
      schedule.push(daySchedule);
    }

    return schedule;
  }

  private static calculateNewSleepSchedule(travel: TravelDetails, timeDiff: number) {
    // Convert time strings to minutes for calculation
    const parseTime = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const formatTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60) % 24;
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    const bedtime = parseTime(travel.usualBedtime);
    const wakeTime = parseTime(travel.usualWakeTime);

    // Adjust sleep schedule by timezone difference
    const adjustedBedtime = bedtime + (timeDiff * 60);
    const adjustedWakeTime = wakeTime + (timeDiff * 60);

    return {
      newBedtime: formatTime(adjustedBedtime),
      newWakeTime: formatTime(adjustedWakeTime),
      adjustmentPhase: Math.abs(timeDiff) > 6 ? 'Major adjustment needed' : 'Moderate adjustment'
    };
  }
}
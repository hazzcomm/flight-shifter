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

  static convertToDestinationTime(localTime: string, sourceTimezone: string, destTimezone: string): Date {
    // Convert local datetime-local input to destination timezone
    const timezones: Record<string, number> = {
      'UTC': 0, 'GMT': 0,
      'EST': -5, 'PST': -8, 'CST': -6, 'MST': -7,
      'JST': 9, 'AEST': 10, 'CET': 1, 'IST': 5.5,
      'HKT': 8, 'SGT': 8, 'CAT': 2, 'EAT': 3
    };
    
    const sourceOffset = timezones[sourceTimezone] || 0;
    const destOffset = timezones[destTimezone] || 0;
    const offsetDiff = destOffset - sourceOffset;
    
    const localDate = new Date(localTime);
    const utcTime = localDate.getTime() - (sourceOffset * 60 * 60 * 1000);
    const destTime = new Date(utcTime + (destOffset * 60 * 60 * 1000));
    
    return destTime;
  }

  static calculateFlightDuration(departureTime: string, arrivalTime: string, 
                                 departureTimezone: string, arrivalTimezone: string): number {
    const depDate = new Date(departureTime);
    const arrDate = this.convertToDestinationTime(arrivalTime, arrivalTimezone, departureTimezone);
    
    return Math.abs(arrDate.getTime() - depDate.getTime()) / (1000 * 60 * 60); // hours
  }

  static calculateJetLagPlan(travel: TravelDetails): JetLagPlan {
    const timeDiff = this.calculateTimeZoneDifference(
      travel.departureTimezone, 
      travel.arrivalTimezone
    );
    
    const direction = timeDiff > 0 ? 'eastward' : 'westward';
    const timeZonesDifference = Math.abs(timeDiff);
    
    // Calculate flight duration for more accurate recommendations
    const flightDuration = this.calculateFlightDuration(
      travel.departureTime, 
      travel.arrivalTime,
      travel.departureTimezone,
      travel.arrivalTimezone
    );
    
    // Get arrival time in destination timezone for context-aware recommendations
    const arrivalInDestination = this.convertToDestinationTime(
      travel.arrivalTime, 
      travel.arrivalTimezone, 
      travel.arrivalTimezone
    );
    
    // Adjust strategy based on flight length and arrival time
    let estimatedAdjustmentDays = Math.ceil(timeZonesDifference * 0.8);
    if (flightDuration > 12) estimatedAdjustmentDays += 1; // Long flights are harder
    if (timeZonesDifference > 8) estimatedAdjustmentDays += 1; // Major time changes
    
    return {
      timeZonesDifference,
      direction,
      estimatedAdjustmentDays,
      preTravelDays: this.generatePreTravelSchedule(direction, timeZonesDifference, flightDuration),
      travelDay: this.generateTravelDaySchedule(direction, travel, arrivalInDestination),
      postTravelDays: this.generatePostTravelSchedule(direction, timeZonesDifference, arrivalInDestination),
      sleepSchedule: this.calculateNewSleepSchedule(travel, timeDiff)
    };
  }

  private static generatePreTravelSchedule(
    direction: 'eastward' | 'westward', 
    timeZones: number,
    flightDuration: number = 8
  ): LightExposureRecommendation[][] {
    // Gradual adjustment: max 1 hour per day, based on NASA research
    const maxAdjustmentDays = Math.min(3, Math.ceil(timeZones / 1)); 
    const dailyShift = Math.min(1, timeZones / maxAdjustmentDays); // Max 1 hour per day
    const schedule: LightExposureRecommendation[][] = [];

    for (let day = 1; day <= maxAdjustmentDays; day++) {
      const daySchedule: LightExposureRecommendation[] = [];
      const cumulativeShift = dailyShift * day;
      
      if (direction === 'eastward') {
        // Eastward: gradually advance sleep schedule
        const adjustedLightTime = Math.max(6, 7 - cumulativeShift);
        const adjustedDimTime = Math.max(19, 22 - cumulativeShift);
        
        daySchedule.push({
          time: `${Math.floor(adjustedLightTime).toString().padStart(2, '0')}:${((adjustedLightTime % 1) * 60).toString().padStart(2, '0')}`,
          action: 'bright_light',
          description: `Get bright morning light (10,000+ lux). Advancing by ${(cumulativeShift * 60).toFixed(0)} minutes total.`,
          intensity: '10,000+ lux'
        });
        daySchedule.push({
          time: `${Math.floor(adjustedDimTime).toString().padStart(2, '0')}:${((adjustedDimTime % 1) * 60).toString().padStart(2, '0')}`,
          action: 'avoid_light',
          description: `Start dimming lights earlier. Go to bed ~${(dailyShift * 60).toFixed(0)} minutes earlier than yesterday.`
        });
        daySchedule.push({
          time: 'Napping',
          action: 'avoid_light',
          description: 'Avoid naps today to build sleep drive. If essential: <20 min before 2 PM only.'
        });
      } else {
        // Westward: gradually delay sleep schedule
        const adjustedDimTime = Math.min(23, 21 + cumulativeShift);
        const adjustedLightTime = Math.min(20, 18 + cumulativeShift);
        
        daySchedule.push({
          time: '07:00',
          action: 'dim_light',
          description: `Keep morning light minimal. Sleep in ${(cumulativeShift * 60).toFixed(0)} minutes later than usual.`
        });
        daySchedule.push({
          time: `${Math.floor(adjustedLightTime).toString().padStart(2, '0')}:${((adjustedLightTime % 1) * 60).toString().padStart(2, '0')}`,
          action: 'bright_light',
          description: `Get bright evening light exposure to delay your clock.`,
          intensity: '10,000+ lux'
        });
        daySchedule.push({
          time: 'Napping',
          action: 'dim_light',
          description: 'Strategic nap OK: <30 min, ending before 3 PM, at least 8 hours before planned bedtime.'
        });
      }
      
      schedule.push(daySchedule);
    }

    return schedule;
  }

  private static generateTravelDaySchedule(
    direction: 'eastward' | 'westward',
    travel: TravelDetails,
    arrivalInDestination: Date
  ): LightExposureRecommendation[] {
    const schedule: LightExposureRecommendation[] = [];
    const arrivalHour = arrivalInDestination.getHours();
    const isArrivalMorning = arrivalHour >= 6 && arrivalHour < 12;
    const isArrivalEvening = arrivalHour >= 18 && arrivalHour < 24;
    const isArrivalNight = arrivalHour >= 0 && arrivalHour < 6;

    // Flight day recommendations based on actual arrival time in destination
    if (direction === 'eastward') {
      schedule.push({
        time: 'During flight',
        action: 'avoid_light',
        description: `Keep cabin lights dim, wear eye mask. You're arriving at ${arrivalHour}:00 local time.`
      });
      
      if (isArrivalMorning) {
        schedule.push({
          time: `Upon arrival (${arrivalHour}:00)`,
          action: 'bright_light',
          description: 'Perfect! Get outdoor sunlight immediately - this will help advance your clock',
          intensity: 'Natural sunlight'
        });
      } else if (isArrivalEvening || isArrivalNight) {
        schedule.push({
          time: `Upon arrival (${arrivalHour}:00)`,
          action: 'avoid_light',
          description: 'Arriving late - keep lights dim and go to sleep as soon as possible',
        });
      } else {
        schedule.push({
          time: `Upon arrival (${arrivalHour}:00)`,
          action: 'bright_light',
          description: 'Get some daylight exposure but not too intense',
          intensity: '2,500+ lux'
        });
      }
    } else {
      schedule.push({
        time: 'During flight',
        action: 'dim_light',
        description: `Stay awake if possible. You're arriving at ${arrivalHour}:00 local time.`
      });
      
      if (isArrivalEvening) {
        schedule.push({
          time: `Upon arrival (${arrivalHour}:00)`,
          action: 'bright_light',
          description: 'Great timing! Seek bright light to delay your clock adjustment',
          intensity: '10,000+ lux'
        });
      } else if (isArrivalMorning) {
        schedule.push({
          time: `Upon arrival (${arrivalHour}:00)`,
          action: 'avoid_light',
          description: 'Arriving morning - wear sunglasses, keep lighting minimal',
        });
      } else {
        schedule.push({
          time: `Upon arrival (${arrivalHour}:00)`,
          action: 'dim_light',
          description: 'Moderate light exposure - avoid too much brightness',
        });
      }
    }

    return schedule;
  }

  private static generatePostTravelSchedule(
    direction: 'eastward' | 'westward',
    timeZones: number,
    arrivalInDestination: Date
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
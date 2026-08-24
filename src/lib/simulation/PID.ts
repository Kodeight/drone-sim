import { clamp, wrapAngle } from '@/lib/utils/math';

export class PID {
  kp: number;
  ki: number;
  kd: number;
  integralLimit: number;
  outputLimit: number;
  outputRateLimit: number;
  angle: boolean;
  feedforwardGain: number;

  private integral: number;
  private previousMeasurement: number;
  private previousOutput: number;
  private initialized: boolean;

  constructor(
    kp: number,
    ki: number,
    kd: number,
    integralLimit: number = 10.0,
    outputLimit: number = 10.0,
    angle: boolean = false,
    feedforwardGain: number = 0.0,
    outputRateLimit: number = Infinity,
  ) {
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;
    this.integralLimit = integralLimit;
    this.outputLimit = outputLimit;
    this.outputRateLimit = outputRateLimit;
    this.angle = angle;
    this.feedforwardGain = feedforwardGain;
    this.integral = 0.0;
    this.previousMeasurement = 0.0;
    this.previousOutput = 0.0;
    this.initialized = false;
  }

  reset(): void {
    this.integral = 0.0;
    this.previousMeasurement = 0.0;
    this.previousOutput = 0.0;
    this.initialized = false;
  }

  setGains(kp: number, ki: number, kd: number): void {
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;
  }

  update(setpoint: number, measurement: number, dt: number, feedforward: number = 0): number {
    if (dt <= 0) return this.previousOutput;

    const error = this.angle
      ? wrapAngle(setpoint - measurement)
      : setpoint - measurement;

    let derivative: number;

    if (!this.initialized) {
      derivative = 0.0;
      this.previousMeasurement = measurement;
      this.initialized = true;
    } else {
      const dMeasurement = this.angle
        ? wrapAngle(measurement - this.previousMeasurement)
        : measurement - this.previousMeasurement;
      derivative = -dMeasurement / dt;
    }

    let tentativeIntegral = this.integral + error * dt;
    tentativeIntegral = clamp(tentativeIntegral, -this.integralLimit, this.integralLimit);

    const unclampedOutput =
      this.kp * error + this.ki * tentativeIntegral + this.kd * derivative;

    const alreadySaturating = Math.abs(unclampedOutput) > this.outputLimit;
    const pushingFurther = unclampedOutput * error > 0;

    if (!(alreadySaturating && pushingFurther)) {
      this.integral = tentativeIntegral;
    }

    let output =
      this.kp * error + this.ki * this.integral + this.kd * derivative;

    // Feed-forward
    output += feedforward * this.feedforwardGain;

    // Output rate limiting
    if (this.outputRateLimit < Infinity) {
      const maxChange = this.outputRateLimit * dt;
      output = clamp(output, this.previousOutput - maxChange, this.previousOutput + maxChange);
    }

    output = clamp(output, -this.outputLimit, this.outputLimit);

    this.previousMeasurement = measurement;
    this.previousOutput = output;
    return output;
  }
}

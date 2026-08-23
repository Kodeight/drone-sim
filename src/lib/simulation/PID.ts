import { clamp, wrapAngle } from '@/lib/utils/math';

export class PID {
  kp: number;
  ki: number;
  kd: number;
  integralLimit: number;
  outputLimit: number;
  angle: boolean;

  private integral: number;
  private previousMeasurement: number;
  private initialized: boolean;
  private lastOutput: number;

  constructor(
    kp: number,
    ki: number,
    kd: number,
    integralLimit: number = 10.0,
    outputLimit: number = 10.0,
    angle: boolean = false
  ) {
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;
    this.integralLimit = integralLimit;
    this.outputLimit = outputLimit;
    this.angle = angle;
    this.integral = 0.0;
    this.previousMeasurement = 0.0;
    this.initialized = false;
    this.lastOutput = 0.0;
  }

  reset(): void {
    this.integral = 0.0;
    this.previousMeasurement = 0.0;
    this.initialized = false;
    this.lastOutput = 0.0;
  }

  update(setpoint: number, measurement: number, dt: number): number {
    if (dt <= 0) return this.lastOutput;

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

    const output = clamp(
      this.kp * error + this.ki * this.integral + this.kd * derivative,
      -this.outputLimit,
      this.outputLimit
    );

    this.previousMeasurement = measurement;
    this.lastOutput = output;
    return output;
  }
}

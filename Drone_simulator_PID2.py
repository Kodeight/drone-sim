import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import math
import csv
import json
import argparse
import threading
import time
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional
import numpy as np
from matplotlib.figure import Figure
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg, NavigationToolbar2Tk
from enum import Enum
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# ============================================================
# ENHANCED DRONE CONFIGURATION SYSTEM
# ============================================================

@dataclass
class MotorConfig:
    """Motor/actuator parameters"""
    max_thrust: float = 6.0          # N per motor
    time_constant: float = 0.008     # seconds (motor response lag)
    yaw_coefficient: float = 0.02    # Drag-torque coupling
    arm_length: float = 0.20         # meters

@dataclass
class InertiaConfig:
    """Inertia tensor"""
    ix: float = 0.025
    iy: float = 0.025
    iz: float = 0.045

@dataclass
class DragConfig:
    """Aerodynamic drag coefficients"""
    linear_xy: float = 0.30          # Linear drag in XY
    linear_z: float = 0.35           # Linear drag in Z
    angular: float = 0.08            # Angular drag
    quadratic_xy: float = 0.02       # Non-linear drag in XY
    quadratic_z: float = 0.03        # Non-linear drag in Z

@dataclass
class ControlLimits:
    """Control authority limits"""
    max_tilt_angle: float = 35.0     # degrees
    max_rate_roll: float = 25.0      # rad/s
    max_rate_pitch: float = 25.0     # rad/s
    max_rate_yaw: float = 25.0       # rad/s
    max_thrust_rate: float = 8.0     # N/s thrust change rate

@dataclass
class SensorConfig:
    """Sensor noise and characteristics"""
    gyro_noise: float = 0.001        # rad/s RMS
    accel_noise: float = 0.01        # m/s² RMS
    gyro_bias: float = 0.0001        # rad/s
    accel_bias: float = 0.001        # m/s²
    update_rate: float = 100.0       # Hz

@dataclass
class DroneConfig:
    """Complete drone configuration"""
    name: str = "Generic Drone"
    description: str = "Medium-sized quadrotor"
    mass: float = 1.0
    inertia: InertiaConfig = field(default_factory=InertiaConfig)
    motor: MotorConfig = field(default_factory=MotorConfig)
    drag: DragConfig = field(default_factory=DragConfig)
    control_limits: ControlLimits = field(default_factory=ControlLimits)
    sensors: SensorConfig = field(default_factory=SensorConfig)
    
    # Ground effect parameters
    ground_effect_strength: float = 0.3
    ground_effect_height: float = 0.5  # meters
    
    # PID gains (will be set per axis)
    pid_gains: Dict[str, Tuple[float, float, float]] = field(default_factory=dict)
    
    def get_pid(self, axis: str) -> Tuple[float, float, float]:
        """Get PID gains for an axis with defaults"""
        defaults = {
            'x': (0.8, 0.02, 0.8),
            'y': (0.8, 0.02, 0.8),
            'z': (4.0, 1.0, 2.5),
            'roll': (4.0, 0.08, 0.5),
            'pitch': (4.0, 0.08, 0.5),
            'yaw': (2.5, 0.03, 0.4),
        }
        return self.pid_gains.get(axis, defaults.get(axis, (1.0, 0.1, 0.5)))

# ============================================================
# DRONE PRESETS
# ============================================================

def create_preset_tiny_whoop() -> DroneConfig:
    return DroneConfig(
        name="Tiny Whoop",
        description="45mm micro drone for indoor FPV",
        mass=0.022,
        inertia=InertiaConfig(ix=0.0002, iy=0.0002, iz=0.0004),
        motor=MotorConfig(max_thrust=0.05, time_constant=0.005, yaw_coefficient=0.001, arm_length=0.03),
        drag=DragConfig(linear_xy=0.05, linear_z=0.06, angular=0.01),
        control_limits=ControlLimits(max_tilt_angle=45.0, max_rate_roll=35.0, max_rate_pitch=35.0, max_rate_yaw=30.0),
        pid_gains={
            'x': (0.5, 0.01, 0.3), 'y': (0.5, 0.01, 0.3),
            'z': (2.0, 0.5, 1.5), 'roll': (3.0, 0.05, 0.3),
            'pitch': (3.0, 0.05, 0.3), 'yaw': (1.5, 0.01, 0.2)
        }
    )

def create_preset_racing_5inch() -> DroneConfig:
    return DroneConfig(
        name="5\" Racing Drone",
        description="High-performance FPV racing quad",
        mass=0.800,
        inertia=InertiaConfig(ix=0.008, iy=0.008, iz=0.014),
        motor=MotorConfig(max_thrust=2.5, time_constant=0.008, yaw_coefficient=0.015, arm_length=0.12),
        drag=DragConfig(linear_xy=0.4, linear_z=0.5, angular=0.05, quadratic_xy=0.03, quadratic_z=0.04),
        control_limits=ControlLimits(max_tilt_angle=65.0, max_rate_roll=45.0, max_rate_pitch=45.0, max_rate_yaw=35.0, max_thrust_rate=15.0),
        pid_gains={
            'x': (2.0, 0.01, 1.5), 'y': (2.0, 0.01, 1.5),
            'z': (6.0, 0.8, 3.5), 'roll': (15.0, 0.02, 2.0),
            'pitch': (15.0, 0.02, 2.0), 'yaw': (8.0, 0.01, 1.2)
        }
    )

def create_preset_cinematic() -> DroneConfig:
    return DroneConfig(
        name="Cinematic Drone",
        description="Professional camera drone, smooth and stable",
        mass=0.895,
        inertia=InertiaConfig(ix=0.012, iy=0.012, iz=0.022),
        motor=MotorConfig(max_thrust=4.5, time_constant=0.010, yaw_coefficient=0.025, arm_length=0.18),
        drag=DragConfig(linear_xy=0.2, linear_z=0.25, angular=0.03, quadratic_xy=0.01, quadratic_z=0.015),
        control_limits=ControlLimits(max_tilt_angle=25.0, max_rate_roll=15.0, max_rate_pitch=15.0, max_rate_yaw=10.0),
        pid_gains={
            'x': (0.5, 0.03, 0.3), 'y': (0.5, 0.03, 0.3),
            'z': (3.0, 0.5, 1.5), 'roll': (2.5, 0.05, 0.3),
            'pitch': (2.5, 0.05, 0.3), 'yaw': (1.5, 0.02, 0.2)
        }
    )

def create_preset_agricultural() -> DroneConfig:
    return DroneConfig(
        name="Agricultural Drone",
        description="Heavy-lift crop spraying drone",
        mass=25.0,
        inertia=InertiaConfig(ix=1.2, iy=1.2, iz=2.5),
        motor=MotorConfig(max_thrust=80.0, time_constant=0.015, yaw_coefficient=0.08, arm_length=0.5),
        drag=DragConfig(linear_xy=1.5, linear_z=2.0, angular=0.2, quadratic_xy=0.1, quadratic_z=0.12),
        control_limits=ControlLimits(max_tilt_angle=20.0, max_rate_roll=10.0, max_rate_pitch=10.0, max_rate_yaw=5.0),
        pid_gains={
            'x': (0.3, 0.05, 0.2), 'y': (0.3, 0.05, 0.2),
            'z': (2.0, 0.3, 1.0), 'roll': (2.0, 0.03, 0.2),
            'pitch': (2.0, 0.03, 0.2), 'yaw': (1.0, 0.01, 0.1)
        }
    )

def create_preset_cargo() -> DroneConfig:
    return DroneConfig(
        name="Cargo Drone",
        description="Package delivery drone with extended range",
        mass=15.0,
        inertia=InertiaConfig(ix=0.8, iy=0.8, iz=1.5),
        motor=MotorConfig(max_thrust=50.0, time_constant=0.020, yaw_coefficient=0.05, arm_length=0.6),
        drag=DragConfig(linear_xy=1.0, linear_z=1.2, angular=0.15, quadratic_xy=0.06, quadratic_z=0.08),
        control_limits=ControlLimits(max_tilt_angle=20.0, max_rate_roll=8.0, max_rate_pitch=8.0, max_rate_yaw=5.0),
        pid_gains={
            'x': (0.2, 0.03, 0.15), 'y': (0.2, 0.03, 0.15),
            'z': (1.5, 0.2, 0.8), 'roll': (1.5, 0.02, 0.15),
            'pitch': (1.5, 0.02, 0.15), 'yaw': (0.8, 0.01, 0.08)
        }
    )

def create_preset_folding_backpack() -> DroneConfig:
    return DroneConfig(
        name="Folding Backpack Drone",
        description="Ultra-compact travel drone",
        mass=0.249,
        inertia=InertiaConfig(ix=0.003, iy=0.003, iz=0.006),
        motor=MotorConfig(max_thrust=1.2, time_constant=0.006, yaw_coefficient=0.008, arm_length=0.08),
        drag=DragConfig(linear_xy=0.15, linear_z=0.18, angular=0.02),
        control_limits=ControlLimits(max_tilt_angle=30.0, max_rate_roll=25.0, max_rate_pitch=25.0, max_rate_yaw=20.0),
        pid_gains={
            'x': (0.6, 0.02, 0.5), 'y': (0.6, 0.02, 0.5),
            'z': (2.5, 0.5, 1.8), 'roll': (3.0, 0.05, 0.4),
            'pitch': (3.0, 0.05, 0.4), 'yaw': (2.0, 0.02, 0.3)
        }
    )

# Custom default (copied from cinematic)
def create_preset_custom() -> DroneConfig:
    return DroneConfig(
        name="Custom Drone",
        description="User-defined configuration",
        mass=0.895,
        inertia=InertiaConfig(ix=0.012, iy=0.012, iz=0.022),
        motor=MotorConfig(max_thrust=4.5, time_constant=0.010, yaw_coefficient=0.025, arm_length=0.18),
        drag=DragConfig(linear_xy=0.2, linear_z=0.25, angular=0.03, quadratic_xy=0.01, quadratic_z=0.015),
        control_limits=ControlLimits(max_tilt_angle=25.0, max_rate_roll=15.0, max_rate_pitch=15.0, max_rate_yaw=10.0),
        pid_gains={
            'x': (0.5, 0.03, 0.3), 'y': (0.5, 0.03, 0.3),
            'z': (3.0, 0.5, 1.5), 'roll': (2.5, 0.05, 0.3),
            'pitch': (2.5, 0.05, 0.3), 'yaw': (1.5, 0.02, 0.2)
        }
    )

# Preset registry - include "custom"
DRONE_PRESETS = {
    "tiny_whoop": create_preset_tiny_whoop,
    "racing_5inch": create_preset_racing_5inch,
    "cinematic": create_preset_cinematic,
    "agricultural": create_preset_agricultural,
    "cargo": create_preset_cargo,
    "folding_backpack": create_preset_folding_backpack,
    "custom": create_preset_custom,
}

# ============================================================
# ENHANCED UTILITIES
# ============================================================

def clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))

def wrap_angle(angle):
    return (angle + math.pi) % (2.0 * math.pi) - math.pi

def rad(deg_value):
    return math.radians(deg_value)

def deg(rad_value):
    return math.degrees(rad_value)

def smooth_dth(dt, tau):
    """First-order low-pass filter coefficient"""
    if tau <= 0:
        return 1.0
    return dt / (dt + tau)

# ============================================================
# ENHANCED PID CONTROLLER
# ============================================================

class EnhancedPID:
    """
    Enhanced PID with:
    - Derivative-on-measurement (no kick)
    - Conditional integration anti-windup
    - Rate limiting on output
    - Optional feed-forward
    - Gain scheduling support
    """
    
    def __init__(
        self,
        kp: float,
        ki: float,
        kd: float,
        integral_limit: float = 10.0,
        output_limit: float = 10.0,
        output_rate_limit: float = float('inf'),
        angle: bool = False,
        feedforward_gain: float = 0.0,
    ):
        self.kp = kp
        self.ki = ki
        self.kd = kd
        self.integral_limit = integral_limit
        self.output_limit = output_limit
        self.output_rate_limit = output_rate_limit
        self.angle = angle
        self.feedforward_gain = feedforward_gain
        
        self.integral = 0.0
        self.previous_measurement = 0.0
        self.previous_output = 0.0
        self.initialized = False
        
        # For gain scheduling
        self.schedule = None  # Function: (error, dt) -> gain_multiplier
        
    def reset(self):
        self.integral = 0.0
        self.previous_measurement = 0.0
        self.previous_output = 0.0
        self.initialized = False
        
    def set_gains(self, kp: float, ki: float, kd: float):
        """Update gains dynamically"""
        self.kp = kp
        self.ki = ki
        self.kd = kd
        
    def update(
        self, 
        setpoint: float, 
        measurement: float, 
        dt: float,
        feedforward: float = 0.0,
    ) -> float:
        if dt <= 0:
            return self.previous_output
            
        # Error calculation with angle wrapping
        if self.angle:
            error = wrap_angle(setpoint - measurement)
        else:
            error = setpoint - measurement
            
        # Derivative-on-measurement
        if not self.initialized:
            derivative = 0.0
            self.previous_measurement = measurement
            self.initialized = True
        else:
            if self.angle:
                d_measurement = wrap_angle(measurement - self.previous_measurement)
            else:
                d_measurement = measurement - self.previous_measurement
            derivative = -d_measurement / dt
            
        # Conditional integration anti-windup
        tentative_integral = self.integral + error * dt
        tentative_integral = clamp(
            tentative_integral, -self.integral_limit, self.integral_limit
        )
        
        # Check if integration would push further into saturation
        unclamped_output = (
            self.kp * error
            + self.ki * tentative_integral
            + self.kd * derivative
        )
        
        already_saturating = abs(unclamped_output) > self.output_limit
        pushing_further = (unclamped_output * error) > 0
        
        if not (already_saturating and pushing_further):
            self.integral = tentative_integral
            
        # Calculate output
        output = (
            self.kp * error
            + self.ki * self.integral
            + self.kd * derivative
        )
        
        # Add feed-forward
        output += feedforward * self.feedforward_gain
        
        # Apply output limits
        output = clamp(output, -self.output_limit, self.output_limit)
        
        # Apply output rate limit
        if self.output_rate_limit < float('inf'):
            max_change = self.output_rate_limit * dt
            output = clamp(
                output,
                self.previous_output - max_change,
                self.previous_output + max_change
            )
        
        self.previous_measurement = measurement
        self.previous_output = output
        
        return output

# ============================================================
# ENHANCED DRONE MODEL
# ============================================================

class EnhancedDrone:
    """
    Enhanced drone model with:
    - Motor dynamics (lag)
    - Non-linear drag
    - Ground effect
    - Sensor simulation (noise)
    - Rate controller inner loop
    """
    
    def __init__(self, config: DroneConfig):
        self.config = config
        
        # State
        self.x = 0.0
        self.y = 0.0
        self.z = 0.0
        
        self.vx = 0.0
        self.vy = 0.0
        self.vz = 0.0
        
        self.roll = 0.0
        self.pitch = 0.0
        self.yaw = 0.0
        
        self.p = 0.0
        self.q = 0.0
        self.r = 0.0
        
        # Motor state (with dynamics)
        self.motor_commands = [0.0, 0.0, 0.0, 0.0]
        self.motor_thrusts = [0.0, 0.0, 0.0, 0.0]
        
        # Sensor state
        self.sensor_gyro = [0.0, 0.0, 0.0]
        self.sensor_accel = [0.0, 0.0, 0.0]
        
        # Previous state for derivatives
        self.prev_z = 0.0
        
    def reset(self):
        self.x = 0.0
        self.y = 0.0
        self.z = 0.0
        self.vx = 0.0
        self.vy = 0.0
        self.vz = 0.0
        self.roll = 0.0
        self.pitch = 0.0
        self.yaw = 0.0
        self.p = 0.0
        self.q = 0.0
        self.r = 0.0
        self.motor_thrusts = [0.0, 0.0, 0.0, 0.0]
        self.prev_z = 0.0
        
    def rotation_matrix(self):
        cr = math.cos(self.roll)
        sr = math.sin(self.roll)
        cp = math.cos(self.pitch)
        sp = math.sin(self.pitch)
        cy = math.cos(self.yaw)
        sy = math.sin(self.yaw)
        
        Rx = np.array([[1, 0, 0], [0, cr, -sr], [0, sr, cr]])
        Ry = np.array([[cp, 0, sp], [0, 1, 0], [-sp, 0, cp]])
        Rz = np.array([[cy, -sy, 0], [sy, cy, 0], [0, 0, 1]])
        
        return Rz @ Ry @ Rx
    
    def mix_and_saturate(self, thrust, roll_torque, pitch_torque, yaw_torque):
        """Motor mixing with saturation, X-configuration"""
        l = self.config.motor.arm_length
        k = self.config.motor.yaw_coefficient
        max_t = self.config.motor.max_thrust
        
        # Compute raw motor commands
        m1 = thrust/4 - roll_torque/(4*l) + pitch_torque/(4*l) + yaw_torque/(4*k)
        m2 = thrust/4 + roll_torque/(4*l) + pitch_torque/(4*l) - yaw_torque/(4*k)
        m3 = thrust/4 - roll_torque/(4*l) - pitch_torque/(4*l) - yaw_torque/(4*k)
        m4 = thrust/4 + roll_torque/(4*l) - pitch_torque/(4*l) + yaw_torque/(4*k)
        
        commands = [
            clamp(m1, 0.0, max_t),
            clamp(m2, 0.0, max_t),
            clamp(m3, 0.0, max_t),
            clamp(m4, 0.0, max_t),
        ]
        
        self.motor_commands = commands
        
        # Apply motor dynamics (low-pass filter)
        tau = self.config.motor.time_constant
        alpha = smooth_dth(0.01, tau)  # Using 0.01s step
        
        for i in range(4):
            self.motor_thrusts[i] += (commands[i] - self.motor_thrusts[i]) * alpha
            
        # Re-derive actual forces from filtered values
        motors = self.motor_thrusts
        
        thrust_actual = sum(motors)
        roll_actual = l * (-motors[0] + motors[1] - motors[2] + motors[3])
        pitch_actual = l * (motors[0] + motors[1] - motors[2] - motors[3])
        yaw_actual = k * (motors[0] - motors[1] - motors[2] + motors[3])
        
        return thrust_actual, roll_actual, pitch_actual, yaw_actual
    
    def compute_drag(self, vx: float, vy: float, vz: float) -> Tuple[float, float, float]:
        """Non-linear drag with both linear and quadratic components"""
        # Horizontal speed
        v_h = math.hypot(vx, vy)
        
        # Linear drag
        drag_x_linear = self.config.drag.linear_xy * vx
        drag_y_linear = self.config.drag.linear_xy * vy
        drag_z_linear = self.config.drag.linear_z * vz
        
        # Quadratic drag (only when moving)
        if v_h > 0.001:
            drag_x_quad = self.config.drag.quadratic_xy * v_h * vx
            drag_y_quad = self.config.drag.quadratic_xy * v_h * vy
        else:
            drag_x_quad = 0.0
            drag_y_quad = 0.0
            
        if abs(vz) > 0.001:
            drag_z_quad = self.config.drag.quadratic_z * abs(vz) * vz
        else:
            drag_z_quad = 0.0
            
        return (
            -(drag_x_linear + drag_x_quad),
            -(drag_y_linear + drag_y_quad),
            -(drag_z_linear + drag_z_quad),
        )
    
    def compute_ground_effect(self) -> float:
        """Ground effect boost (increased lift near ground)"""
        if self.z <= 0:
            return 1.0
        
        h = self.config.ground_effect_height
        strength = self.config.ground_effect_strength
        
        if self.z < h:
            factor = 1.0 + strength * (1.0 - self.z / h)
            return factor
        return 1.0
    
    def simulate_sensors(self, p: float, q: float, r: float, ax: float, ay: float, az: float):
        """Add realistic sensor noise"""
        import random
        
        g = self.config.sensors
        self.sensor_gyro = [
            p + random.gauss(0, g.gyro_noise) + g.gyro_bias,
            q + random.gauss(0, g.gyro_noise) + g.gyro_bias,
            r + random.gauss(0, g.gyro_noise) + g.gyro_bias,
        ]
        self.sensor_accel = [
            ax + random.gauss(0, g.accel_noise) + g.accel_bias,
            ay + random.gauss(0, g.accel_noise) + g.accel_bias,
            az + random.gauss(0, g.accel_noise) + g.accel_bias,
        ]
    
    def update(
        self,
        thrust: float,
        roll_torque: float,
        pitch_torque: float,
        yaw_torque: float,
        disturbance_x: float,
        disturbance_y: float,
        disturbance_z: float,
        disturbance_roll: float,
        disturbance_pitch: float,
        disturbance_yaw: float,
        dt: float
    ):
        # Apply thrust rate limit
        max_rate = self.config.control_limits.max_thrust_rate
        if max_rate < float('inf'):
            # Simplified thrust rate limiting
            pass
        
        # Motor mixing with saturation and dynamics
        thrust, roll_torque, pitch_torque, yaw_torque = self.mix_and_saturate(
            thrust, roll_torque, pitch_torque, yaw_torque
        )
        
        # --- ROTATIONAL DYNAMICS ---
        Ix, Iy, Iz = self.config.inertia.ix, self.config.inertia.iy, self.config.inertia.iz
        ang_drag = self.config.drag.angular
        
        roll_acc = (
            roll_torque + disturbance_roll
            - ang_drag * self.p
            + (Iy - Iz) * self.q * self.r
        ) / Ix
        
        pitch_acc = (
            pitch_torque + disturbance_pitch
            - ang_drag * self.q
            + (Iz - Ix) * self.p * self.r
        ) / Iy
        
        yaw_acc = (
            yaw_torque + disturbance_yaw
            - ang_drag * self.r
            + (Ix - Iy) * self.p * self.q
        ) / Iz
        
        self.p += roll_acc * dt
        self.q += pitch_acc * dt
        self.r += yaw_acc * dt
        
        # Rate limits
        limits = self.config.control_limits
        self.p = clamp(self.p, -limits.max_rate_roll, limits.max_rate_roll)
        self.q = clamp(self.q, -limits.max_rate_pitch, limits.max_rate_pitch)
        self.r = clamp(self.r, -limits.max_rate_yaw, limits.max_rate_yaw)
        
        # --- EULER ANGLE KINEMATICS ---
        cos_pitch = math.cos(self.pitch)
        if abs(cos_pitch) < 1e-3:
            cos_pitch = 1e-3 if cos_pitch >= 0 else -1e-3
            
        sin_roll = math.sin(self.roll)
        cos_roll = math.cos(self.roll)
        tan_pitch = math.sin(self.pitch) / cos_pitch
        
        roll_dot = self.p + sin_roll * tan_pitch * self.q + cos_roll * tan_pitch * self.r
        pitch_dot = cos_roll * self.q - sin_roll * self.r
        yaw_dot = (sin_roll / cos_pitch) * self.q + (cos_roll / cos_pitch) * self.r
        
        self.roll += roll_dot * dt
        self.pitch += pitch_dot * dt
        self.yaw += yaw_dot * dt
        
        # Attitude limits
        max_tilt = rad(self.config.control_limits.max_tilt_angle)
        self.pitch = clamp(self.pitch, -max_tilt, max_tilt)
        self.roll = wrap_angle(self.roll)
        self.yaw = wrap_angle(self.yaw)
        
        # --- TRANSLATIONAL DYNAMICS ---
        R = self.rotation_matrix()
        
        # Thrust in world frame
        thrust_body = np.array([0.0, 0.0, thrust])
        thrust_world = R @ thrust_body
        
        # Ground effect
        ground_effect = self.compute_ground_effect()
        thrust_world[2] *= ground_effect
        
        # Drag
        drag_x, drag_y, drag_z = self.compute_drag(self.vx, self.vy, self.vz)
        
        # Forces
        mass = self.config.mass
        g = 9.81
        
        fx = thrust_world[0] + drag_x + disturbance_x
        fy = thrust_world[1] + drag_y + disturbance_y
        fz = thrust_world[2] - mass * g + drag_z + disturbance_z
        
        ax = fx / mass
        ay = fy / mass
        az = fz / mass
        
        self.vx += ax * dt
        self.vy += ay * dt
        self.vz += az * dt
        
        # Velocity limits
        self.vx = clamp(self.vx, -15, 15)
        self.vy = clamp(self.vy, -15, 15)
        self.vz = clamp(self.vz, -10, 10)
        
        self.x += self.vx * dt
        self.y += self.vy * dt
        self.z += self.vz * dt
        
        # Ground contact
        if self.z < 0:
            self.z = 0
            if self.vz < 0:
                self.vz = 0
        
        # Simulate sensors
        self.simulate_sensors(self.p, self.q, self.r, ax, ay, az)
        
        self.prev_z = self.z

# ============================================================
# ENHANCED CONTROLLER
# ============================================================

class EnhancedController:
    """
    Enhanced controller with:
    - Cascaded position → attitude → rate control
    - Feed-forward terms
    - Gain scheduling
    - Rate damping
    """
    
    def __init__(self, config: DroneConfig):
        self.config = config
        
        # Position controllers (world frame)
        gains = config.get_pid('x')
        self.pid_x = EnhancedPID(
            gains[0], gains[1], gains[2],
            integral_limit=3, output_limit=4,
            feedforward_gain=0.5
        )
        gains = config.get_pid('y')
        self.pid_y = EnhancedPID(
            gains[0], gains[1], gains[2],
            integral_limit=3, output_limit=4,
            feedforward_gain=0.5
        )
        gains = config.get_pid('z')
        self.pid_z = EnhancedPID(
            gains[0], gains[1], gains[2],
            integral_limit=5, output_limit=8,
            feedforward_gain=0.3
        )
        
        # Attitude controllers
        gains = config.get_pid('roll')
        self.pid_roll = EnhancedPID(
            gains[0], gains[1], gains[2],
            integral_limit=1, output_limit=1,
            feedforward_gain=0.2
        )
        gains = config.get_pid('pitch')
        self.pid_pitch = EnhancedPID(
            gains[0], gains[1], gains[2],
            integral_limit=1, output_limit=1,
            feedforward_gain=0.2
        )
        gains = config.get_pid('yaw')
        self.pid_yaw = EnhancedPID(
            gains[0], gains[1], gains[2],
            integral_limit=1, output_limit=1,
            angle=True, feedforward_gain=0.1
        )
        
        # Rate damping gains (optional inner loop)
        self.rate_damping_roll = 0.05
        self.rate_damping_pitch = 0.05
        self.rate_damping_yaw = 0.03
        
    def reset(self):
        self.pid_x.reset()
        self.pid_y.reset()
        self.pid_z.reset()
        self.pid_roll.reset()
        self.pid_pitch.reset()
        self.pid_yaw.reset()
        
    def update_gains(self, config: DroneConfig):
        """Update PID gains from config"""
        self.config = config
        
        for axis, pid in [('x', self.pid_x), ('y', self.pid_y), 
                          ('z', self.pid_z), ('roll', self.pid_roll),
                          ('pitch', self.pid_pitch), ('yaw', self.pid_yaw)]:
            gains = config.get_pid(axis)
            pid.set_gains(gains[0], gains[1], gains[2])
    
    def update(
        self,
        drone: EnhancedDrone,
        target_x: float,
        target_y: float,
        target_z: float,
        target_roll: float,
        target_pitch: float,
        target_yaw: float,
        auto_heading: bool,
        dt: float
    ) -> Tuple[float, float, float, float]:
        """Compute thrust and torques"""
        
        # --- POSITION CONTROL ---
        # Position error for feed-forward
        err_x = target_x - drone.x
        err_y = target_y - drone.y
        err_z = target_z - drone.z
        
        # Feed-forward terms (based on target velocity prediction)
        ff_x = err_x * 0.5 / (dt + 0.01) if abs(err_x) > 0.01 else 0.0
        ff_y = err_y * 0.5 / (dt + 0.01) if abs(err_y) > 0.01 else 0.0
        ff_z = err_z * 0.3 / (dt + 0.01) if abs(err_z) > 0.01 else 0.0
        
        # Gain scheduling based on error magnitude
        def get_gain_multiplier(error, max_error=5.0):
            if abs(error) < 0.5:
                return 0.7  # Small error - less aggressive
            elif abs(error) < 2.0:
                return 1.0  # Normal
            else:
                return min(1.5, 1.0 + abs(error) / max_error)  # Large error - more aggressive
        
        # Store original gains for scheduling
        # (Simplified: just use the feed-forward for now)
        
        ax_world = self.pid_x.update(target_x, drone.x, dt, ff_x)
        ay_world = self.pid_y.update(target_y, drone.y, dt, ff_y)
        
        # --- TRANSFORM TO BODY FRAME ---
        yaw = drone.yaw
        ax_body = math.cos(yaw) * ax_world + math.sin(yaw) * ay_world
        ay_body = -math.sin(yaw) * ax_world + math.cos(yaw) * ay_world
        
        # --- ATTITUDE CONTROL ---
        g = 9.81
        max_tilt = rad(self.config.control_limits.max_tilt_angle)
        
        # Desired attitude from acceleration commands
        desired_pitch_position = clamp(ax_body / g, -max_tilt, max_tilt)
        desired_roll_position = clamp(-ay_body / g, -max_tilt, max_tilt)
        
        # Combine with user attitude targets
        desired_roll = clamp(
            rad(target_roll) + desired_roll_position,
            -max_tilt, max_tilt
        )
        desired_pitch = clamp(
            rad(target_pitch) + desired_pitch_position,
            -max_tilt, max_tilt
        )
        
        # --- RATE DAMPING ---
        # Attitude controller with rate damping
        roll_torque = self.pid_roll.update(
            desired_roll, drone.roll, dt
        ) - self.rate_damping_roll * drone.p
        
        pitch_torque = self.pid_pitch.update(
            desired_pitch, drone.pitch, dt
        ) - self.rate_damping_pitch * drone.q
        
        # --- HEADING CONTROL ---
        horizontal_speed = math.hypot(drone.vx, drone.vy)
        
        if auto_heading:
            if horizontal_speed > 0.05:
                travel_yaw = math.atan2(drone.vy, drone.vx)
            else:
                dx = target_x - drone.x
                dy = target_y - drone.y
                if math.hypot(dx, dy) > 0.05:
                    travel_yaw = math.atan2(dy, dx)
                else:
                    travel_yaw = drone.yaw
            yaw_target = travel_yaw
        else:
            yaw_target = rad(target_yaw)
        
        yaw_torque = self.pid_yaw.update(
            yaw_target, drone.yaw, dt
        ) - self.rate_damping_yaw * drone.r
        
        # --- ALTITUDE CONTROL ---
        altitude_command = self.pid_z.update(target_z, drone.z, dt, ff_z)
        
        # Thrust: gravity compensation + altitude command
        thrust = max(0.0, drone.config.mass * g + altitude_command)
        
        # Apply thrust limits
        max_thrust = 4 * drone.config.motor.max_thrust
        thrust = clamp(thrust, 0.0, max_thrust)
        
        return thrust, roll_torque, pitch_torque, yaw_torque, yaw_target

# ============================================================
# HTTP BACKEND (authoritative Python simulation for UI)
# ============================================================

class DroneHTTPBackend:
    def __init__(self):
        self.config = create_preset_cinematic()
        self.drone = EnhancedDrone(self.config)
        self.controller = EnhancedController(self.config)
        self.running = False
        self.simulation_time = 0.0
        self.lock = threading.Lock()
        self.target = {
            'x': 0.0, 'y': 0.0, 'z': 3.0,
            'roll': 0.0, 'pitch': 0.0, 'yaw': 0.0,
            'auto_heading': True,
        }
        self.disturbances = {
            'forceX': 0.0, 'forceY': 0.0, 'forceZ': 0.0,
            'torqueRoll': 0.0, 'torquePitch': 0.0, 'torqueYaw': 0.0,
        }
        self.pid = {
            'X': {'kp': 0.5, 'ki': 0.03, 'kd': 0.3},
            'Y': {'kp': 0.5, 'ki': 0.03, 'kd': 0.3},
            'Z': {'kp': 3.0, 'ki': 0.5, 'kd': 1.5},
            'Roll': {'kp': 2.5, 'ki': 0.05, 'kd': 0.3},
            'Pitch': {'kp': 2.5, 'ki': 0.05, 'kd': 0.3},
            'Yaw': {'kp': 1.5, 'ki': 0.02, 'kd': 0.2},
        }
        self._thread = None
        self._stop_event = threading.Event()
        self._reset_state()

    def _reset_state(self):
        self.drone.reset()
        self.controller.reset()
        self.simulation_time = 0.0
        self.running = False

    def set_target(self, payload: Dict[str, float]):
        for key in ('x', 'y', 'z', 'roll', 'pitch', 'yaw'):
            if key in payload:
                self.target[key] = float(payload[key])
        if 'auto_heading' in payload:
            self.target['auto_heading'] = bool(payload.get('auto_heading', True))

    def set_disturbance(self, payload: Dict[str, float]):
        for key, value in payload.items():
            if key in self.disturbances:
                self.disturbances[key] = float(value)

    def set_pid(self, axis: str, payload: Dict[str, float]):
        key = axis.capitalize()
        if key in ('X', 'Y', 'Z', 'Roll', 'Pitch', 'Yaw'):
            controller = self.controller
            if axis == 'x':
                controller.pid_x.set_gains(float(payload.get('kp', controller.pid_x.kp)), float(payload.get('ki', controller.pid_x.ki)), float(payload.get('kd', controller.pid_x.kd)))
            elif axis == 'y':
                controller.pid_y.set_gains(float(payload.get('kp', controller.pid_y.kp)), float(payload.get('ki', controller.pid_y.ki)), float(payload.get('kd', controller.pid_y.kd)))
            elif axis == 'z':
                controller.pid_z.set_gains(float(payload.get('kp', controller.pid_z.kp)), float(payload.get('ki', controller.pid_z.ki)), float(payload.get('kd', controller.pid_z.kd)))
            elif axis == 'roll':
                controller.pid_roll.set_gains(float(payload.get('kp', controller.pid_roll.kp)), float(payload.get('ki', controller.pid_roll.ki)), float(payload.get('kd', controller.pid_roll.kd)))
            elif axis == 'pitch':
                controller.pid_pitch.set_gains(float(payload.get('kp', controller.pid_pitch.kp)), float(payload.get('ki', controller.pid_pitch.ki)), float(payload.get('kd', controller.pid_pitch.kd)))
            elif axis == 'yaw':
                controller.pid_yaw.set_gains(float(payload.get('kp', controller.pid_yaw.kp)), float(payload.get('ki', controller.pid_yaw.ki)), float(payload.get('kd', controller.pid_yaw.kd)))
            self.pid[key] = {'kp': float(payload.get('kp', self.pid[key]['kp'])), 'ki': float(payload.get('ki', self.pid[key]['ki'])), 'kd': float(payload.get('kd', self.pid[key]['kd'])) }

    def command(self, name: str):
        if name == 'start':
            self.running = True
        elif name in ('stop', 'pause'):
            self.running = False
        elif name == 'reset':
            self._reset_state()
            self.target = {'x': 0.0, 'y': 0.0, 'z': 3.0, 'roll': 0.0, 'pitch': 0.0, 'yaw': 0.0, 'auto_heading': True}
            self.disturbances = {'forceX': 0.0, 'forceY': 0.0, 'forceZ': 0.0, 'torqueRoll': 0.0, 'torquePitch': 0.0, 'torqueYaw': 0.0}
        elif name == 'toggle':
            self.running = not self.running

    def step(self, dt: float):
        if not self.running:
            return

        thrust, roll_torque, pitch_torque, yaw_torque, yaw_target = self.controller.update(
            self.drone,
            self.target['x'],
            self.target['y'],
            self.target['z'],
            self.target['roll'],
            self.target['pitch'],
            self.target['yaw'],
            self.target['auto_heading'],
            dt,
        )

        self.drone.update(
            thrust,
            roll_torque,
            pitch_torque,
            yaw_torque,
            self.disturbances['forceX'],
            self.disturbances['forceY'],
            self.disturbances['forceZ'],
            self.disturbances['torqueRoll'],
            self.disturbances['torquePitch'],
            self.disturbances['torqueYaw'],
            dt,
        )
        self.simulation_time += dt

    def state_payload(self):
        d = self.drone
        dist = math.hypot(self.target['x'] - d.x, self.target['y'] - d.y, self.target['z'] - d.z)
        payload = {
            'time': self.simulation_time,
            'x': d.x,
            'y': d.y,
            'z': d.z,
            'vx': d.vx,
            'vy': d.vy,
            'vz': d.vz,
            'roll': d.roll,
            'pitch': d.pitch,
            'yaw': d.yaw,
            'p': d.p,
            'q': d.q,
            'r': d.r,
            'motor1': d.motor_thrusts[0],
            'motor2': d.motor_thrusts[1],
            'motor3': d.motor_thrusts[2],
            'motor4': d.motor_thrusts[3],
            'thrust': d.motor_thrusts[0] + d.motor_thrusts[1] + d.motor_thrusts[2] + d.motor_thrusts[3],
            'roll_torque': 0.0,
            'pitch_torque': 0.0,
            'yaw_torque': 0.0,
            'distanceToTarget': dist,
            'status': 'ON_TARGET' if dist < 0.15 else 'TRACKING' if self.running else 'STOPPED',
            'target': {**self.target},
        }
        return payload

    def _loop(self):
        while not self._stop_event.is_set():
            self.step(0.01)
            time.sleep(0.01)

    def run_server(self, host: str = '127.0.0.1', port: int = 8765):
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                try:
                    if self.path == '/health':
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.end_headers()
                        self.wfile.write(json.dumps({'ok': True, 'status': 'alive'}).encode())
                        return

                    if self.path == '/api/state':
                        payload = backend.state_payload()
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.end_headers()
                        self.wfile.write(json.dumps(payload).encode())
                        return

                    self.send_response(404)
                    self.end_headers()
                except Exception as exc:
                    self.send_response(500)
                    self.end_headers()
                    self.wfile.write(str(exc).encode())

            def do_POST(self):
                try:
                    length = int(self.headers.get('Content-Length', '0'))
                    body = self.rfile.read(length) if length > 0 else b'{}'
                    payload = json.loads(body.decode('utf-8') or '{}')

                    if self.path == '/api/command':
                        command = payload.get('command', '')
                        backend.command(command)
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.end_headers()
                        self.wfile.write(json.dumps({'ok': True, 'command': command}).encode())
                        return

                    if self.path == '/api/target':
                        backend.set_target(payload)
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.end_headers()
                        self.wfile.write(json.dumps({'ok': True, 'target': backend.target}).encode())
                        return

                    if self.path == '/api/pid':
                        axis = payload.get('axis', '')
                        params = payload.get('params', {})
                        backend.set_pid(axis, params)
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.end_headers()
                        self.wfile.write(json.dumps({'ok': True, 'axis': axis, 'params': params}).encode())
                        return

                    if self.path == '/api/disturbance':
                        backend.set_disturbance(payload)
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.end_headers()
                        self.wfile.write(json.dumps({'ok': True, 'disturbances': backend.disturbances}).encode())
                        return

                    self.send_response(404)
                    self.end_headers()
                except Exception as exc:
                    self.send_response(500)
                    self.end_headers()
                    self.wfile.write(str(exc).encode())

            def log_message(self, format, *args):
                return

        httpd = ThreadingHTTPServer((host, port), Handler)
        httpd.serve_forever()


backend = DroneHTTPBackend()

if __name__ == '__main__':
    backend.run_server()
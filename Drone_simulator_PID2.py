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
# THEME (same as before but enhanced)
# ============================================================

THEME = {
    "bg": "#f4f6fb",
    "border": "#d7dce6",
    "text": "#1c2333",
    "muted": "#6b7280",
    "accent": "#2f6fed",
    "accent2": "#0e8f83",
    "success": "#1f9d55",
    "warning": "#b45309",
    "danger": "#dc2626",
    "entry_bg": "#ffffff",
    "tab_inactive": "#e6e9f2",
    "grid": "#e2e6ef",
}

UI_FONT = ("Segoe UI", 10)
UI_FONT_BOLD = ("Segoe UI", 10, "bold")
UI_FONT_SMALL = ("Segoe UI", 8)
UI_FONT_HEADER = ("Segoe UI", 10, "bold")

PLOT_COLORS = ["#0e8f83", "#d97706", "#2f6fed"]

def configure_style(root):
    root.configure(bg=THEME["bg"])
    style = ttk.Style(root)
    try:
        style.theme_use("clam")
    except tk.TclError:
        pass
    
    style.configure(".", background=THEME["bg"], foreground=THEME["text"], font=UI_FONT)
    style.configure("TFrame", background=THEME["bg"])
    style.configure("TLabel", background=THEME["bg"], foreground=THEME["text"])
    style.configure(
        "TLabelframe",
        background=THEME["bg"],
        bordercolor=THEME["border"],
        relief="solid",
        borderwidth=1
    )
    style.configure(
        "TLabelframe.Label",
        background=THEME["bg"],
        foreground=THEME["accent2"],
        font=UI_FONT_HEADER
    )
    style.configure(
        "TButton",
        background=THEME["entry_bg"],
        foreground=THEME["text"],
        bordercolor=THEME["border"],
        borderwidth=1,
        focuscolor=THEME["bg"],
        padding=(10, 6)
    )
    style.map("TButton", background=[("active", THEME["border"])])
    style.configure(
        "Primary.TButton",
        background=THEME["success"],
        foreground="#0c1f16",
        bordercolor=THEME["success"],
        padding=(14, 7),
        font=UI_FONT_BOLD
    )
    style.map("Primary.TButton", background=[("active", "#59d89e")])
    style.configure(
        "Danger.TButton",
        background=THEME["danger"],
        foreground="#2b0a0d",
        bordercolor=THEME["danger"],
        padding=(14, 7),
        font=UI_FONT_BOLD
    )
    style.map("Danger.TButton", background=[("active", "#f47b86")])
    style.configure(
        "TEntry",
        fieldbackground=THEME["entry_bg"],
        foreground=THEME["text"],
        bordercolor=THEME["border"],
        insertcolor=THEME["accent2"],
        lightcolor=THEME["entry_bg"],
        darkcolor=THEME["entry_bg"]
    )
    style.configure(
        "TScale",
        background=THEME["bg"],
        troughcolor=THEME["entry_bg"],
        bordercolor=THEME["border"],
        lightcolor=THEME["accent"],
        darkcolor=THEME["accent"]
    )
    style.configure(
        "TCheckbutton",
        background=THEME["bg"],
        foreground=THEME["text"],
        focuscolor=THEME["bg"]
    )
    style.map(
        "TCheckbutton",
        indicatorcolor=[("selected", THEME["accent"]), ("!selected", THEME["entry_bg"])]
    )
    style.configure(
        "Horizontal.TProgressbar",
        troughcolor=THEME["entry_bg"],
        background=THEME["accent2"],
        bordercolor=THEME["border"],
        lightcolor=THEME["accent2"],
        darkcolor=THEME["accent2"]
    )
    style.configure(
        "Saturated.Horizontal.TProgressbar",
        troughcolor=THEME["entry_bg"],
        background=THEME["danger"],
        bordercolor=THEME["border"],
        lightcolor=THEME["danger"],
        darkcolor=THEME["danger"]
    )
    style.configure(
        "TNotebook",
        background=THEME["bg"],
        bordercolor=THEME["border"]
    )
    style.configure(
        "TNotebook.Tab",
        background=THEME["tab_inactive"],
        foreground=THEME["muted"],
        padding=(16, 9),
        font=UI_FONT_BOLD,
        bordercolor=THEME["border"]
    )
    style.map(
        "TNotebook.Tab",
        background=[("selected", THEME["bg"])],
        foreground=[("selected", THEME["accent2"])]
    )
    return style

# ============================================================
# TOOLTIP
# ============================================================

class Tooltip:
    def __init__(self, widget, text):
        self.widget = widget
        self.text = text
        self.tip = None
        widget.bind("<Enter>", self.show)
        widget.bind("<Leave>", self.hide)

    def show(self, event=None):
        if self.tip or not self.text:
            return
        x = self.widget.winfo_rootx() + 12
        y = self.widget.winfo_rooty() + self.widget.winfo_height() + 6
        self.tip = tk.Toplevel(self.widget)
        self.tip.wm_overrideredirect(True)
        self.tip.wm_geometry(f"+{x}+{y}")
        label = tk.Label(
            self.tip,
            text=self.text,
            background=THEME["entry_bg"],
            foreground=THEME["text"],
            relief="solid",
            borderwidth=1,
            highlightbackground=THEME["accent2"],
            highlightthickness=1,
            font=UI_FONT_SMALL,
            justify="left",
            wraplength=260
        )
        label.pack(ipadx=5, ipady=3)

    def hide(self, event=None):
        if self.tip:
            self.tip.destroy()
            self.tip = None

# ============================================================
# ENHANCED APPLICATION
# ============================================================

class EnhancedDroneSimulator:
    
    def __init__(self, root):
        self.root = root
        self.root.title("Enhanced Drone Simulator - 6-DOF with Advanced Physics")
        self.root.geometry("1600x960")
        self.root.minsize(1280, 740)
        
        # --- SIMULATION ---
        self.dt = 0.01
        self.simulation_time = 0.0
        self.running = False
        self.steps_per_frame = 4
        
        # --- DRONE CONFIGURATION ---
        self.current_preset = "cinematic"
        self.drone_config = create_preset_cinematic()
        self.custom_config = None  # Store the custom config when edited
        
        # --- DRONE ---
        self.drone = EnhancedDrone(self.drone_config)
        self.controller = EnhancedController(self.drone_config)
        
        # --- TARGETS ---
        self.target_x = tk.DoubleVar(value=0.0)
        self.target_y = tk.DoubleVar(value=0.0)
        self.target_z = tk.DoubleVar(value=3.0)
        self.target_roll = tk.DoubleVar(value=0.0)
        self.target_pitch = tk.DoubleVar(value=0.0)
        self.target_yaw = tk.DoubleVar(value=0.0)
        
        self.auto_heading = tk.BooleanVar(value=True)
        self.travel_yaw_deg = 0.0
        
        # --- DISTURBANCES ---
        self.dist_x = tk.DoubleVar(value=0.0)
        self.dist_y = tk.DoubleVar(value=0.0)
        self.dist_z = tk.DoubleVar(value=0.0)
        self.dist_roll = tk.DoubleVar(value=0.0)
        self.dist_pitch = tk.DoubleVar(value=0.0)
        self.dist_yaw = tk.DoubleVar(value=0.0)
        
        # --- PID VARIABLES ---
        self.pid_values = {
            "X": {"kp": tk.DoubleVar(value=0.8), "ki": tk.DoubleVar(value=0.02), "kd": tk.DoubleVar(value=0.8)},
            "Y": {"kp": tk.DoubleVar(value=0.8), "ki": tk.DoubleVar(value=0.02), "kd": tk.DoubleVar(value=0.8)},
            "Z": {"kp": tk.DoubleVar(value=4.0), "ki": tk.DoubleVar(value=1.0), "kd": tk.DoubleVar(value=2.5)},
            "Roll": {"kp": tk.DoubleVar(value=4.0), "ki": tk.DoubleVar(value=0.08), "kd": tk.DoubleVar(value=0.5)},
            "Pitch": {"kp": tk.DoubleVar(value=4.0), "ki": tk.DoubleVar(value=0.08), "kd": tk.DoubleVar(value=0.5)},
            "Yaw": {"kp": tk.DoubleVar(value=2.5), "ki": tk.DoubleVar(value=0.03), "kd": tk.DoubleVar(value=0.4)}
        }
        
        self.pid_ranges = {"kp": (0.0, 20.0), "ki": (0.0, 5.0), "kd": (0.0, 10.0)}
        
        self.pid_presets = {
            "Soft": {
                "X": (0.5, 0.00, 0.6), "Y": (0.5, 0.00, 0.6), "Z": (3.0, 0.5, 2.0),
                "Roll": (2.5, 0.02, 0.35), "Pitch": (2.5, 0.02, 0.35), "Yaw": (1.5, 0.01, 0.30)
            },
            "Nominal": {
                "X": (0.8, 0.02, 0.8), "Y": (0.8, 0.02, 0.8), "Z": (4.0, 1.0, 2.5),
                "Roll": (4.0, 0.08, 0.50), "Pitch": (4.0, 0.08, 0.50), "Yaw": (2.5, 0.03, 0.40)
            },
            "Aggressive": {
                "X": (1.4, 0.05, 1.0), "Y": (1.4, 0.05, 1.0), "Z": (6.0, 1.5, 3.2),
                "Roll": (7.0, 0.15, 0.70), "Pitch": (7.0, 0.15, 0.70), "Yaw": (4.0, 0.06, 0.50)
            }
        }
        
        self.speed = tk.DoubleVar(value=1.0)
        self.graph_zoom_state = {}
        
        # --- HISTORY ---
        self.history = {
            "time": [], "x": [], "y": [], "z": [],
            "target_x": [], "target_y": [], "target_z": [],
            "roll": [], "pitch": [], "yaw": [],
            "target_roll": [], "target_pitch": [], "target_yaw": [],
            "vx": [], "vy": [], "vz": [],
            "desired_roll": [], "desired_pitch": [],
            "ax_command": [], "ay_command": [],
            "thrust": [],
            "roll_torque": [], "pitch_torque": [], "yaw_torque": [],
            "motor1": [], "motor2": [], "motor3": [], "motor4": [],
            "sensor_gyro_x": [], "sensor_gyro_y": [], "sensor_gyro_z": [],
        }
        
        self.build_interface()
        self.root.bind("<space>", self.handle_space)
        self.update_display()
    
    # ============================================================
    # INTERFACE BUILDING
    # ============================================================
    
    def build_interface(self):
        # Top bar
        top = ttk.Frame(self.root)
        top.pack(fill="x", padx=10, pady=(10, 6))
        
        title = ttk.Label(
            top, text="🚁 ENHANCED DRONE CONTROL CENTER",
            font=("Segoe UI", 13, "bold"), foreground=THEME["text"]
        )
        title.pack(side="left", padx=(0, 18))
        
        # Drone selection dropdown
        ttk.Label(top, text="Drone:").pack(side="left", padx=(10, 5))
        self.drone_var = tk.StringVar(value="cinematic")
        drone_menu = ttk.Combobox(
            top, textvariable=self.drone_var,
            values=list(DRONE_PRESETS.keys()),
            state="readonly", width=18
        )
        drone_menu.pack(side="left", padx=5)
        drone_menu.bind("<<ComboboxSelected>>", self.on_drone_changed)
        Tooltip(drone_menu, "Select a drone configuration preset")
        
        # Edit Custom button (initially hidden/disabled)
        self.edit_custom_btn = ttk.Button(
            top, text="✎ Edit Custom", command=self.edit_custom_drone,
            state="disabled"
        )
        self.edit_custom_btn.pack(side="left", padx=5)
        Tooltip(self.edit_custom_btn, "Edit the parameters of the custom drone")
        
        # Drone info label
        self.drone_info = ttk.Label(top, text="", foreground=THEME["muted"], font=UI_FONT_SMALL)
        self.drone_info.pack(side="left", padx=10)
        
        # Control buttons
        self.start_button = ttk.Button(
            top, text="▶  START", style="Primary.TButton", command=self.toggle_simulation
        )
        self.start_button.pack(side="left")
        Tooltip(self.start_button, "Start or pause the simulation (shortcut: Space)")
        
        reset_button = ttk.Button(top, text="↻  RESET", command=self.reset)
        reset_button.pack(side="left", padx=6)
        Tooltip(reset_button, "Reset the drone, controllers and history")
        
        save_button = ttk.Button(top, text="⇣  SAVE CSV", command=self.save_csv)
        save_button.pack(side="left")
        Tooltip(save_button, "Export the recorded time history to a CSV file")
        
        ttk.Label(top, text="   Speed:", foreground=THEME["muted"]).pack(side="left")
        speed_scale = ttk.Scale(top, from_=0.1, to=5.0, variable=self.speed, orient="horizontal", length=140)
        speed_scale.pack(side="left", padx=4)
        self.speed_label = ttk.Label(top, text="1.0x", foreground=THEME["muted"], width=5)
        self.speed_label.pack(side="left")
        
        self.status_detail_label = ttk.Label(top, text="", foreground=THEME["muted"])
        self.status_detail_label.pack(side="right", padx=(0, 4))
        self.status_label = ttk.Label(
            top, text="● STOPPED", font=UI_FONT_BOLD, foreground=THEME["muted"]
        )
        self.status_label.pack(side="right", padx=10)
        
        tk.Frame(self.root, height=1, bg=THEME["border"]).pack(fill="x", padx=10)
        
        # Main area
        main = ttk.Frame(self.root)
        main.pack(fill="both", expand=True, padx=10, pady=8)
        
        # Left panel
        self.left_panel = ttk.Frame(main, width=580)
        self.left_panel.pack(side="left", fill="y", expand=False, padx=(0, 10))
        self.left_panel.pack_propagate(False)
        
        # Right notebook
        self.right_notebook = ttk.Notebook(main)
        self.right_notebook.pack(side="left", fill="both", expand=True)
        
        overview_tab = ttk.Frame(self.right_notebook)
        graphs_tab = ttk.Frame(self.right_notebook)
        
        self.right_notebook.add(overview_tab, text="🖥  OVERVIEW")
        self.right_notebook.add(graphs_tab, text="📈  GRAPHS")
        
        # Build left panels
        self.build_drone_info_panel(self.left_panel)
        self.build_targets(self.left_panel)
        self.build_pid_controls(self.left_panel)
        self.build_disturbances(self.left_panel)
        self.build_telemetry(self.left_panel)
        
        # Build overview tab
        overview_split = ttk.PanedWindow(overview_tab, orient="horizontal")
        overview_split.pack(fill="both", expand=True)
        
        view_pane = ttk.LabelFrame(overview_split, text="🛸  3D DRONE VIEW")
        overview_split.add(view_pane, weight=1)
        self.build_3d_view(view_pane, mini=True)
        
        data_pane = ttk.Frame(overview_split)
        overview_split.add(data_pane, weight=1)
        
        motor_frame = ttk.LabelFrame(data_pane, text="⚙  MOTOR THRUST / SATURATION")
        motor_frame.pack(side="bottom", fill="x", pady=(6, 0))
        self.build_motor_telemetry(motor_frame)
        
        mini_graph_frame = ttk.LabelFrame(data_pane, text="📊  SYSTEM RESPONSE")
        mini_graph_frame.pack(side="top", fill="both", expand=True)
        self.build_mini_graphs(mini_graph_frame)
        
        self.root.after(150, lambda: overview_split.sashpos(0, int(self.root.winfo_width() * 0.40)))
        
        # Build graphs tab
        full_graph_frame = ttk.LabelFrame(graphs_tab, text="📊  SYSTEM RESPONSE — DETAILED VIEW")
        full_graph_frame.pack(fill="both", expand=True, padx=4, pady=4)
        self.build_full_graphs(full_graph_frame)
        
        # Enable/disable edit button based on initial selection
        self.update_edit_button_state()
    
    def update_edit_button_state(self):
        """Enable the 'Edit Custom' button only when 'custom' is selected."""
        if self.drone_var.get() == "custom":
            self.edit_custom_btn.config(state="normal")
        else:
            self.edit_custom_btn.config(state="disabled")
    
    # ============================================================
    # DRONE INFO PANEL
    # ============================================================
    
    def build_drone_info_panel(self, parent):
        frame = ttk.LabelFrame(parent, text="📋  DRONE CONFIGURATION")
        frame.pack(fill="x", pady=(0, 8))
        
        self.drone_info_text = tk.StringVar()
        info_label = ttk.Label(
            frame, textvariable=self.drone_info_text,
            font=UI_FONT_SMALL, foreground=THEME["muted"],
            justify="left"
        )
        info_label.pack(fill="x", padx=8, pady=6)
        self.update_drone_info()
    
    def update_drone_info(self):
        config = self.drone_config
        twr = 4 * config.motor.max_thrust / (config.mass * 9.81)
        info = (
            f"Name: {config.name}\n"
            f"Mass: {config.mass:.3f} kg | TWR: {twr:.2f}\n"
            f"Arm: {config.motor.arm_length*1000:.0f}mm | Max Thrust: {config.motor.max_thrust:.1f}N\n"
            f"Inertia: Ix={config.inertia.ix:.4f}, Iy={config.inertia.iy:.4f}, Iz={config.inertia.iz:.4f}"
        )
        self.drone_info_text.set(info)
    
    # ============================================================
    # DRONE SELECTION
    # ============================================================
    
    def on_drone_changed(self, event=None):
        preset_name = self.drone_var.get()
        self.update_edit_button_state()
        
        # If custom is selected but we don't have a custom config yet, create one from current
        if preset_name == "custom" and self.custom_config is None:
            # Create a copy of the current config (or default cinematic) as starting point
            self.custom_config = create_preset_cinematic()
            self.custom_config.name = "Custom Drone"
            self.drone_config = self.custom_config
            self.apply_config()
            return
        
        if preset_name in DRONE_PRESETS:
            if preset_name == "custom":
                if self.custom_config is not None:
                    self.drone_config = self.custom_config
                else:
                    # fallback
                    self.drone_config = create_preset_custom()
            else:
                self.drone_config = DRONE_PRESETS[preset_name]()
                # If we switch away from custom, we don't delete the custom config, but we use the preset
                self.custom_config = None  # we might want to keep it? We'll keep it.
            
            self.apply_config()
    
    def apply_config(self):
        """Apply the current drone_config to the simulation."""
        # Check TWR
        twr = 4 * self.drone_config.motor.max_thrust / (self.drone_config.mass * 9.81)
        if twr < 1.0:
            messagebox.showwarning("Low Thrust Warning",
                f"Thrust-to-weight ratio = {twr:.2f}\n"
                "The drone may not be able to take off.\n"
                "Consider increasing max_thrust or reducing mass.")
        
        # Stop simulation if running
        was_running = self.running
        if was_running:
            self.toggle_simulation()
        
        # Replace drone and controller
        self.drone = EnhancedDrone(self.drone_config)
        self.controller = EnhancedController(self.drone_config)
        
        # Update PID sliders to match new config
        axes = ['X', 'Y', 'Z', 'Roll', 'Pitch', 'Yaw']
        for axis in axes:
            gains = self.drone_config.get_pid(axis.lower())
            self.pid_values[axis]["kp"].set(gains[0])
            self.pid_values[axis]["ki"].set(gains[1])
            self.pid_values[axis]["kd"].set(gains[2])
        
        # Update motor bar maximums to new max thrust
        new_max = self.drone_config.motor.max_thrust
        for bar in self.motor_bars:
            bar["maximum"] = new_max
        
        # Update drone info label
        self.update_drone_info()
        
        # Reset simulation (clears history and state)
        self.reset()
        
        # Restart if it was running
        if was_running:
            self.toggle_simulation()
    
    # ============================================================
    # CUSTOM DRONE EDITOR
    # ============================================================
    
    def edit_custom_drone(self):
        """Open a dialog to edit the custom drone parameters."""
        if self.drone_var.get() != "custom":
            messagebox.showinfo("Info", "Please select 'custom' from the drone dropdown first.")
            return
        
        # Use the current config as base
        config = self.drone_config if self.custom_config is not None else create_preset_custom()
        
        # Create a new top-level window
        dialog = tk.Toplevel(self.root)
        dialog.title("Custom Drone Configuration")
        dialog.geometry("700x800")
        dialog.transient(self.root)
        dialog.grab_set()
        
        # Create a scrollable frame
        canvas = tk.Canvas(dialog, borderwidth=0)
        scrollbar = ttk.Scrollbar(dialog, orient="vertical", command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # Store entry variables
        entries = {}
        
        def add_entry(label, default, unit="", row=None, col=0, sticky="w", span=1, converter=float):
            row = len(entries) if row is None else row
            ttk.Label(scrollable_frame, text=f"{label}:", font=UI_FONT_BOLD).grid(row=row, column=col, sticky="e", padx=5, pady=2)
            var = tk.StringVar(value=str(default))
            entry = ttk.Entry(scrollable_frame, textvariable=var, width=12)
            entry.grid(row=row, column=col+1, sticky="w", padx=5, pady=2)
            if unit:
                ttk.Label(scrollable_frame, text=unit, font=UI_FONT_SMALL).grid(row=row, column=col+2, sticky="w", padx=2)
            entries[label] = (var, converter)
            return row
        
        # Organize with sections
        row = 0
        # Mass
        add_entry("Mass (kg)", config.mass, "kg", row, 0)
        row += 1
        # Inertia
        add_entry("Inertia Ix", config.inertia.ix, "kg·m²", row, 0)
        add_entry("Inertia Iy", config.inertia.iy, "kg·m²", row, 2)
        add_entry("Inertia Iz", config.inertia.iz, "kg·m²", row, 4)
        row += 1
        # Motor
        add_entry("Max Thrust (N)", config.motor.max_thrust, "N", row, 0)
        add_entry("Time Constant", config.motor.time_constant, "s", row, 2)
        add_entry("Yaw Coeff", config.motor.yaw_coefficient, "", row, 4)
        row += 1
        add_entry("Arm Length", config.motor.arm_length, "m", row, 0)
        row += 1
        # Drag
        add_entry("Drag lin XY", config.drag.linear_xy, "N/(m/s)", row, 0)
        add_entry("Drag lin Z", config.drag.linear_z, "N/(m/s)", row, 2)
        add_entry("Drag ang", config.drag.angular, "N·m/(rad/s)", row, 4)
        row += 1
        add_entry("Drag quad XY", config.drag.quadratic_xy, "N/(m/s)²", row, 0)
        add_entry("Drag quad Z", config.drag.quadratic_z, "N/(m/s)²", row, 2)
        row += 1
        # Control limits
        add_entry("Max tilt angle", config.control_limits.max_tilt_angle, "deg", row, 0)
        add_entry("Max roll rate", config.control_limits.max_rate_roll, "rad/s", row, 2)
        add_entry("Max pitch rate", config.control_limits.max_rate_pitch, "rad/s", row, 4)
        row += 1
        add_entry("Max yaw rate", config.control_limits.max_rate_yaw, "rad/s", row, 0)
        add_entry("Max thrust rate", config.control_limits.max_thrust_rate, "N/s", row, 2)
        row += 1
        # Ground effect
        add_entry("Ground effect strength", config.ground_effect_strength, "", row, 0)
        add_entry("Ground effect height", config.ground_effect_height, "m", row, 2)
        row += 1
        # PID gains (six axes)
        ttk.Label(scrollable_frame, text="--- PID GAINS (Kp, Ki, Kd) ---", font=UI_FONT_HEADER).grid(row=row, column=0, columnspan=6, pady=5)
        row += 1
        for axis in ['x','y','z','roll','pitch','yaw']:
            kp, ki, kd = config.get_pid(axis)
            lbl = ttk.Label(scrollable_frame, text=f"{axis.upper()}:", font=UI_FONT_BOLD)
            lbl.grid(row=row, column=0, sticky="e", padx=5)
            e_kp = ttk.Entry(scrollable_frame, width=8); e_kp.insert(0, f"{kp:.3f}"); e_kp.grid(row=row, column=1, padx=2)
            e_ki = ttk.Entry(scrollable_frame, width=8); e_ki.insert(0, f"{ki:.3f}"); e_ki.grid(row=row, column=2, padx=2)
            e_kd = ttk.Entry(scrollable_frame, width=8); e_kd.insert(0, f"{kd:.3f}"); e_kd.grid(row=row, column=3, padx=2)
            entries[f"pid_{axis}_kp"] = (e_kp, float)
            entries[f"pid_{axis}_ki"] = (e_ki, float)
            entries[f"pid_{axis}_kd"] = (e_kd, float)
            row += 1
        
        # Buttons
        btn_frame = ttk.Frame(scrollable_frame)
        btn_frame.grid(row=row, column=0, columnspan=6, pady=10)
        
        def apply_changes():
            try:
                # Gather values
                mass = entries["Mass (kg)"][0].get()
                ix = entries["Inertia Ix"][0].get()
                iy = entries["Inertia Iy"][0].get()
                iz = entries["Inertia Iz"][0].get()
                max_thrust = entries["Max Thrust (N)"][0].get()
                time_c = entries["Time Constant"][0].get()
                yaw_coeff = entries["Yaw Coeff"][0].get()
                arm_len = entries["Arm Length"][0].get()
                drag_xy = entries["Drag lin XY"][0].get()
                drag_z = entries["Drag lin Z"][0].get()
                drag_ang = entries["Drag ang"][0].get()
                drag_qxy = entries["Drag quad XY"][0].get()
                drag_qz = entries["Drag quad Z"][0].get()
                tilt = entries["Max tilt angle"][0].get()
                rate_r = entries["Max roll rate"][0].get()
                rate_p = entries["Max pitch rate"][0].get()
                rate_y = entries["Max yaw rate"][0].get()
                thrust_rate = entries["Max thrust rate"][0].get()
                ge_strength = entries["Ground effect strength"][0].get()
                ge_height = entries["Ground effect height"][0].get()
                
                # Convert
                mass_f = float(mass)
                ix_f = float(ix); iy_f = float(iy); iz_f = float(iz)
                max_t_f = float(max_thrust)
                time_c_f = float(time_c)
                yaw_c_f = float(yaw_coeff)
                arm_l_f = float(arm_len)
                drag_xy_f = float(drag_xy)
                drag_z_f = float(drag_z)
                drag_ang_f = float(drag_ang)
                drag_qxy_f = float(drag_qxy)
                drag_qz_f = float(drag_qz)
                tilt_f = float(tilt)
                rate_r_f = float(rate_r)
                rate_p_f = float(rate_p)
                rate_y_f = float(rate_y)
                thrust_rate_f = float(thrust_rate)
                ge_str_f = float(ge_strength)
                ge_h_f = float(ge_height)
                
                # PID gains
                pid_dict = {}
                for axis in ['x','y','z','roll','pitch','yaw']:
                    kp = float(entries[f"pid_{axis}_kp"][0].get())
                    ki = float(entries[f"pid_{axis}_ki"][0].get())
                    kd = float(entries[f"pid_{axis}_kd"][0].get())
                    pid_dict[axis] = (kp, ki, kd)
                
                # Build new config
                new_config = DroneConfig(
                    name="Custom Drone",
                    description="User-defined configuration",
                    mass=mass_f,
                    inertia=InertiaConfig(ix=ix_f, iy=iy_f, iz=iz_f),
                    motor=MotorConfig(max_thrust=max_t_f, time_constant=time_c_f,
                                      yaw_coefficient=yaw_c_f, arm_length=arm_l_f),
                    drag=DragConfig(linear_xy=drag_xy_f, linear_z=drag_z_f, angular=drag_ang_f,
                                    quadratic_xy=drag_qxy_f, quadratic_z=drag_qz_f),
                    control_limits=ControlLimits(max_tilt_angle=tilt_f, max_rate_roll=rate_r_f,
                                                 max_rate_pitch=rate_p_f, max_rate_yaw=rate_y_f,
                                                 max_thrust_rate=thrust_rate_f),
                    ground_effect_strength=ge_str_f,
                    ground_effect_height=ge_h_f,
                    pid_gains=pid_dict
                )
                # Store and apply
                self.custom_config = new_config
                # Update drone_var to custom if not already
                if self.drone_var.get() != "custom":
                    self.drone_var.set("custom")
                    self.update_edit_button_state()
                # Apply the new config
                self.drone_config = new_config
                self.apply_config()
                dialog.destroy()
            except Exception as e:
                messagebox.showerror("Error", f"Invalid input: {str(e)}")
        
        ttk.Button(btn_frame, text="Apply", command=apply_changes, style="Primary.TButton").pack(side="left", padx=5)
        ttk.Button(btn_frame, text="Cancel", command=dialog.destroy).pack(side="left", padx=5)
        
        # Pack the canvas and scrollbar
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
    
    # ============================================================
    # TARGET CONTROLS
    # ============================================================
    
    def build_targets(self, parent):
        frame = ttk.LabelFrame(parent, text="🎯  TARGET POSITION / ATTITUDE")
        frame.pack(fill="x", pady=(0, 8))
        
        left = ttk.Frame(frame)
        right = ttk.Frame(frame)
        left.grid(row=0, column=0, sticky="ew", padx=4, pady=3)
        right.grid(row=0, column=1, sticky="ew", padx=4, pady=3)
        frame.columnconfigure(0, weight=1)
        frame.columnconfigure(1, weight=1)
        
        ttk.Label(left, text="POSITION (m)", font=UI_FONT_BOLD, foreground=THEME["muted"]).pack(anchor="w")
        self.small_control(left, "X", self.target_x, -10, 10)
        self.small_control(left, "Y", self.target_y, -10, 10)
        self.small_control(left, "Z", self.target_z, 0, 10)
        
        ttk.Label(right, text="ATTITUDE (deg)", font=UI_FONT_BOLD, foreground=THEME["muted"]).pack(anchor="w")
        self.small_control(right, "Roll", self.target_roll, -30, 30)
        self.small_control(right, "Pitch", self.target_pitch, -30, 30)
        self.small_control(right, "Yaw", self.target_yaw, -180, 180)
        
        auto_check = ttk.Checkbutton(
            right, text="Heading follows direction of travel", variable=self.auto_heading
        )
        auto_check.pack(anchor="w", pady=(4, 0))
        Tooltip(
            auto_check,
            "When on, the drone automatically yaws to face the direction of travel"
        )
    
    def small_control(self, parent, name, variable, minimum, maximum, tooltip=None):
        row = ttk.Frame(parent)
        row.pack(fill="x", pady=1)
        label = ttk.Label(row, text=name, width=6)
        label.pack(side="left")
        if tooltip:
            Tooltip(label, tooltip)
        ttk.Scale(
            row, from_=minimum, to=maximum, variable=variable, orient="horizontal"
        ).pack(side="left", fill="x", expand=True, padx=3)
        entry = ttk.Entry(row, width=7, justify="center")
        entry.pack(side="left")
        entry.insert(0, f"{variable.get():.2f}")
        
        def apply(event=None):
            try:
                value = clamp(float(entry.get()), minimum, maximum)
                variable.set(value)
                entry.delete(0, tk.END)
                entry.insert(0, f"{value:.2f}")
            except ValueError:
                entry.delete(0, tk.END)
                entry.insert(0, f"{variable.get():.2f}")
        
        def sync(*args):
            if entry.focus_get() != entry:
                entry.delete(0, tk.END)
                entry.insert(0, f"{variable.get():.2f}")
        
        variable.trace_add("write", sync)
        entry.bind("<Return>", apply)
        entry.bind("<FocusOut>", apply)
    
    # ============================================================
    # PID CONTROLS
    # ============================================================
    
    def build_pid_controls(self, parent):
        frame = ttk.LabelFrame(parent, text="🎛  PID PARAMETERS")
        frame.pack(fill="x", pady=8)
        
        # Presets
        preset_row = ttk.Frame(frame)
        preset_row.pack(fill="x", padx=4, pady=(4, 2))
        ttk.Label(preset_row, text="Tuning Presets:").pack(side="left")
        for name in ("Soft", "Nominal", "Aggressive"):
            button = ttk.Button(
                preset_row, text=name, width=10,
                command=lambda n=name: self.apply_preset(n)
            )
            button.pack(side="left", padx=2)
            Tooltip(button, f"Load the '{name}' tuning for all six axes")
        
        # Header
        header = ttk.Frame(frame)
        header.pack(fill="x", padx=4, pady=(2, 2))
        header.columnconfigure(0, minsize=55)
        header.columnconfigure(1, weight=1)
        header.columnconfigure(2, weight=1)
        header.columnconfigure(3, weight=1)
        
        ttk.Label(header, text="AXIS", anchor="center").grid(row=0, column=0, sticky="ew")
        kp_label = ttk.Label(header, text="Kp", anchor="center", font=("TkDefaultFont", 9, "bold"))
        kp_label.grid(row=0, column=1, sticky="ew")
        Tooltip(kp_label, "Proportional gain")
        ki_label = ttk.Label(header, text="Ki", anchor="center", font=("TkDefaultFont", 9, "bold"))
        ki_label.grid(row=0, column=2, sticky="ew")
        Tooltip(ki_label, "Integral gain")
        kd_label = ttk.Label(header, text="Kd", anchor="center", font=("TkDefaultFont", 9, "bold"))
        kd_label.grid(row=0, column=3, sticky="ew")
        Tooltip(kd_label, "Derivative gain")
        
        # Table
        table = ttk.Frame(frame)
        table.pack(fill="x", padx=4, pady=(0, 4))
        table.columnconfigure(0, minsize=55, weight=0)
        table.columnconfigure(1, weight=1)
        table.columnconfigure(2, weight=1)
        table.columnconfigure(3, weight=1)
        
        axes = ["X", "Y", "Z", "Roll", "Pitch", "Yaw"]
        for row, axis in enumerate(axes):
            ttk.Label(
                table, text=axis, anchor="center", font=("TkDefaultFont", 9, "bold")
            ).grid(row=row, column=0, sticky="nsew", padx=2, pady=3)
            self.pid_cell(table, row, 1, axis, "kp")
            self.pid_cell(table, row, 2, axis, "ki")
            self.pid_cell(table, row, 3, axis, "kd")
    
    def pid_cell(self, parent, row, column, axis, parameter):
        cell = ttk.Frame(parent, height=28)
        cell.grid(row=row, column=column, sticky="ew", padx=3, pady=2)
        cell.grid_propagate(False)
        cell.columnconfigure(0, weight=1)
        cell.columnconfigure(1, minsize=58, weight=0)
        
        variable = self.pid_values[axis][parameter]
        minimum, maximum = self.pid_ranges[parameter]
        slider = ttk.Scale(cell, from_=minimum, to=maximum, variable=variable, orient="horizontal")
        slider.grid(row=0, column=0, sticky="ew", padx=(0, 4))
        entry = ttk.Entry(cell, width=7, justify="center", font=("TkDefaultFont", 8))
        entry.grid(row=0, column=1, sticky="ew")
        entry.delete(0, tk.END)
        entry.insert(0, self.pid_format(variable.get()))
        
        def update_entry(*args):
            try:
                if entry.focus_get() != entry:
                    entry.delete(0, tk.END)
                    entry.insert(0, self.pid_format(variable.get()))
            except tk.TclError:
                pass
        variable.trace_add("write", update_entry)
        
        def apply_entry(event=None):
            try:
                value = clamp(float(entry.get()), minimum, maximum)
                variable.set(value)
                entry.delete(0, tk.END)
                entry.insert(0, self.pid_format(value))
            except ValueError:
                entry.delete(0, tk.END)
                entry.insert(0, self.pid_format(variable.get()))
        entry.bind("<Return>", apply_entry)
        entry.bind("<FocusOut>", apply_entry)
    
    def pid_format(self, value):
        return f"{value:.3f}" if abs(value) < 0.1 else f"{value:.2f}"
    
    def apply_preset(self, name):
        preset = self.pid_presets[name]
        for axis, (kp, ki, kd) in preset.items():
            self.pid_values[axis]["kp"].set(kp)
            self.pid_values[axis]["ki"].set(ki)
            self.pid_values[axis]["kd"].set(kd)
    
    # ============================================================
    # DISTURBANCES
    # ============================================================
    
    def build_disturbances(self, parent):
        frame = ttk.LabelFrame(parent, text="🌪  DISTURBANCES / WIND")
        frame.pack(fill="x", pady=8)
        
        left = ttk.Frame(frame)
        right = ttk.Frame(frame)
        left.grid(row=0, column=0, sticky="ew", padx=4, pady=3)
        right.grid(row=0, column=1, sticky="ew", padx=4, pady=3)
        frame.columnconfigure(0, weight=1)
        frame.columnconfigure(1, weight=1)
        
        self.small_control(left, "Force X", self.dist_x, -3, 3, "Constant force disturbance, world X axis (N)")
        self.small_control(left, "Force Y", self.dist_y, -3, 3, "Constant force disturbance, world Y axis (N)")
        self.small_control(left, "Force Z", self.dist_z, -3, 3, "Constant force disturbance, world Z axis (N)")
        self.small_control(right, "Roll", self.dist_roll, -0.5, 0.5, "Disturbance torque about roll axis (N·m)")
        self.small_control(right, "Pitch", self.dist_pitch, -0.5, 0.5, "Disturbance torque about pitch axis (N·m)")
        self.small_control(right, "Yaw", self.dist_yaw, -0.5, 0.5, "Disturbance torque about yaw axis (N·m)")
    
    # ============================================================
    # TELEMETRY
    # ============================================================
    
    def build_telemetry(self, parent):
        frame = ttk.LabelFrame(parent, text="📡  TELEMETRY")
        frame.pack(fill="x", pady=8)
        
        self.telemetry = {}
        rows = [
            ("X", "m"), ("Y", "m"), ("Z", "m"),
            ("Roll", "deg"), ("Pitch", "deg"), ("Yaw", "deg"),
            ("Vx", "m/s"), ("Vy", "m/s"), ("Vz", "m/s")
        ]
        for i, (name, unit) in enumerate(rows):
            row = i // 3
            column = i % 3
            cell = ttk.Frame(frame)
            cell.grid(row=row, column=column, sticky="ew", padx=4, pady=2)
            frame.columnconfigure(column, weight=1)
            value = tk.StringVar(value="0.00")
            self.telemetry[name] = value
            ttk.Label(cell, text=f"{name} ({unit}):", foreground=THEME["muted"]).pack(side="left")
            ttk.Label(
                cell, textvariable=value, width=8, font=UI_FONT_BOLD, foreground=THEME["accent2"]
            ).pack(side="right")
        
        # Motor info
        motor_row = ttk.Frame(frame)
        motor_row.grid(row=3, column=0, columnspan=3, sticky="ew", padx=4, pady=(6, 2))
        self.motor_thrust_text = tk.StringVar(value="M: 0.0 0.0 0.0 0.0 N")
        ttk.Label(
            motor_row, textvariable=self.motor_thrust_text,
            font=UI_FONT_SMALL, foreground=THEME["muted"]
        ).pack(side="left")
        
        # Distance
        distance_row = ttk.Frame(frame)
        distance_row.grid(row=4, column=0, columnspan=3, sticky="ew", padx=4, pady=(2, 2))
        ttk.Label(distance_row, text="Distance to target:", foreground=THEME["muted"]).pack(side="left")
        self.distance_var = tk.StringVar(value="0.00 m")
        ttk.Label(
            distance_row, textvariable=self.distance_var, width=10, font=UI_FONT_BOLD,
            foreground=THEME["accent"]
        ).pack(side="right")
    
    # ============================================================
    # MOTOR TELEMETRY
    # ============================================================
    
    def build_motor_telemetry(self, parent):
        names = ["M1  FRONT-LEFT", "M2  FRONT-RIGHT", "M3  REAR-LEFT", "M4  REAR-RIGHT"]
        self.motor_bars = []
        self.motor_labels = []
        
        for i, name in enumerate(names):
            cell = ttk.Frame(parent)
            cell.grid(row=0, column=i, padx=16, pady=(12, 4), sticky="ew")
            parent.columnconfigure(i, weight=1)
            ttk.Label(cell, text=name, font=UI_FONT_BOLD, foreground=THEME["muted"]).pack()
            bar = ttk.Progressbar(
                cell, maximum=self.drone_config.motor.max_thrust, length=130, orient="horizontal"
            )
            bar.pack(pady=6)
            label = ttk.Label(cell, text="0.00 N", font=("Segoe UI", 12, "bold"))
            label.pack()
            self.motor_bars.append(bar)
            self.motor_labels.append(label)
        
        note = ttk.Label(
            parent,
            text="Red = motor at max thrust (control authority lost on that axis)",
            font=UI_FONT_SMALL, foreground=THEME["muted"]
        )
        note.grid(row=1, column=0, columnspan=4, pady=(2, 12))
    
    # ============================================================
    # 3D VIEW
    # ============================================================
    
    def build_3d_view(self, parent, mini=False):
        figsize = (5.5, 5.0) if mini else (9, 6)
        dpi = 85 if mini else 100
        self.figure_3d = Figure(figsize=figsize, dpi=dpi)
        self.figure_3d.patch.set_facecolor(THEME["bg"])
        self.ax_3d = self.figure_3d.add_subplot(111, projection="3d")
        self.figure_3d.subplots_adjust(left=0.0, right=1.0, bottom=0.0, top=0.96)
        self.canvas_3d = FigureCanvasTkAgg(self.figure_3d, parent)
        self.canvas_3d.get_tk_widget().configure(background=THEME["bg"], highlightthickness=0)
        self.canvas_3d.get_tk_widget().pack(fill="both", expand=True, padx=4, pady=4)
        self.update_3d()
    
    def update_3d(self):
        ax = self.ax_3d
        d = self.drone
        ax.clear()
        
        # Styling
        ax.set_facecolor(THEME["bg"])
        pane_color = (0.94, 0.95, 0.98, 1.0)
        for axis in (ax.xaxis, ax.yaxis, ax.zaxis):
            axis.set_pane_color(pane_color)
            axis.line.set_color(THEME["border"])
            axis._axinfo["grid"]["color"] = THEME["grid"]
        ax.tick_params(colors=THEME["muted"], labelsize=8)
        
        R = d.rotation_matrix()
        arm = 1.4
        arms = [
            np.array([[-arm, 0, 0], [arm, 0, 0]]),
            np.array([[0, -arm, 0], [0, arm, 0]])
        ]
        for a in arms:
            world = R @ a.T
            ax.plot(
                world[0] + d.x, world[1] + d.y, world[2] + d.z,
                linewidth=5, color=THEME["accent2"]
            )
        
        motors = np.array([[arm, 0, 0], [-arm, 0, 0], [0, arm, 0], [0, -arm, 0]])
        motors_world = R @ motors.T
        ax.scatter(
            motors_world[0] + d.x, motors_world[1] + d.y, motors_world[2] + d.z,
            s=110, color=THEME["warning"], edgecolor=THEME["bg"], linewidth=0.5
        )
        ax.scatter([d.x], [d.y], [d.z], s=140, color=THEME["accent"], edgecolor=THEME["bg"])
        
        heading = R @ np.array([2.0, 0, 0])
        ax.quiver(
            d.x, d.y, d.z, heading[0], heading[1], heading[2],
            linewidth=3, color=THEME["danger"]
        )
        
        tx, ty, tz = self.target_x.get(), self.target_y.get(), self.target_z.get()
        ax.scatter([tx], [ty], [tz], marker="x", s=190, linewidths=3, color=THEME["success"])
        ax.plot([d.x, tx], [d.y, ty], [d.z, tz], "--", linewidth=1, color=THEME["success"], alpha=0.6)
        
        if len(self.history["x"]) > 2:
            ax.plot(
                self.history["x"][-500:],
                self.history["y"][-500:],
                self.history["z"][-500:],
                linewidth=1.2, color=THEME["accent"], alpha=0.75
            )
        
        view_range = 8
        ax.set_xlim(d.x - view_range, d.x + view_range)
        ax.set_ylim(d.y - view_range, d.y + view_range)
        ax.set_zlim(0, max(8, d.z + 5))
        ax.set_xlabel("X (m)", color=THEME["muted"], fontsize=9)
        ax.set_ylabel("Y (m)", color=THEME["muted"], fontsize=9)
        ax.set_zlabel("Z (m)", color=THEME["muted"], fontsize=9)
        ax.set_title(f"{self.drone_config.name}", fontsize=13, fontweight="bold", color=THEME["text"])
        ax.view_init(elev=25, azim=-55)
        self.canvas_3d.draw_idle()
    
    # ============================================================
    # GRAPHS
    # ============================================================
    
    def build_mini_graphs(self, parent):
        self.mini_figure = Figure(figsize=(4.6, 7.2), dpi=88)
        self.mini_figure.patch.set_facecolor(THEME["bg"])
        self.mini_ax_position = self.mini_figure.add_subplot(311)
        self.mini_ax_attitude = self.mini_figure.add_subplot(312)
        self.mini_ax_velocity = self.mini_figure.add_subplot(313)
        self.mini_figure.subplots_adjust(left=0.16, right=0.97, bottom=0.05, top=0.95, hspace=0.65)
        self.mini_canvas = FigureCanvasTkAgg(self.mini_figure, parent)
        self.mini_canvas.get_tk_widget().configure(background=THEME["bg"], highlightthickness=0)
        self.mini_canvas.get_tk_widget().pack(fill="both", expand=True, padx=4, pady=(4, 0))
        hint = ttk.Label(
            parent, text="Scroll to zoom · double-click an axis to reset",
            foreground=THEME["muted"], font=UI_FONT_SMALL
        )
        hint.pack(pady=(0, 4))
        self.register_zoom(
            self.mini_canvas,
            [self.mini_ax_position, self.mini_ax_attitude, self.mini_ax_velocity]
        )
        self.update_mini_graphs()
    
    def build_full_graphs(self, parent):
        self.full_figure = Figure(figsize=(9, 9), dpi=100)
        self.full_figure.patch.set_facecolor(THEME["bg"])
        self.full_ax_position = self.full_figure.add_subplot(311)
        self.full_ax_attitude = self.full_figure.add_subplot(312)
        self.full_ax_velocity = self.full_figure.add_subplot(313)
        self.full_figure.subplots_adjust(left=0.08, right=0.98, bottom=0.06, top=0.96, hspace=0.5)
        canvas_holder = ttk.Frame(parent)
        canvas_holder.pack(fill="both", expand=True)
        self.full_canvas = FigureCanvasTkAgg(self.full_figure, canvas_holder)
        self.full_canvas.get_tk_widget().configure(background=THEME["bg"], highlightthickness=0)
        self.full_canvas.get_tk_widget().pack(side="top", fill="both", expand=True, padx=4, pady=4)
        toolbar_frame = tk.Frame(parent, background=THEME["bg"])
        toolbar_frame.pack(side="bottom", fill="x")
        toolbar = NavigationToolbar2Tk(self.full_canvas, toolbar_frame)
        toolbar.config(background=THEME["bg"])
        toolbar._message_label.config(background=THEME["bg"], foreground=THEME["muted"])
        toolbar.update()
        self.register_zoom(
            self.full_canvas,
            [self.full_ax_position, self.full_ax_attitude, self.full_ax_velocity]
        )
        self.update_full_graphs()
    
    def register_zoom(self, canvas, axes):
        def on_scroll(event):
            ax = event.inaxes
            if ax not in axes or event.xdata is None or event.ydata is None:
                return
            factor = 0.85 if event.button == "up" else (1.0 / 0.85)
            xlim, ylim = ax.get_xlim(), ax.get_ylim()
            x, y = event.xdata, event.ydata
            new_xlim = (x - (x - xlim[0]) * factor, x + (xlim[1] - x) * factor)
            new_ylim = (y - (y - ylim[0]) * factor, y + (ylim[1] - y) * factor)
            ax.set_xlim(new_xlim)
            ax.set_ylim(new_ylim)
            self.graph_zoom_state[id(ax)] = (new_xlim, new_ylim)
            canvas.draw_idle()
        
        def on_double_click(event):
            ax = event.inaxes
            if ax not in axes or not event.dblclick:
                return
            self.graph_zoom_state.pop(id(ax), None)
            canvas.draw_idle()
        
        canvas.mpl_connect("scroll_event", on_scroll)
        canvas.mpl_connect("button_press_event", on_double_click)
    
    def draw_series(self, ax, t, series, title, ylabel, mini, show_xlabel):
        for data, label, color, linestyle, alpha, linewidth in series:
            ax.plot(t, data, linestyle, label=label, color=color, alpha=alpha, linewidth=linewidth)
        title_fs = 9 if mini else 12
        axis_fs = 7 if mini else 10
        tick_fs = 6 if mini else 8
        legend_fs = 6 if mini else 8
        ax.set_facecolor(THEME["bg"])
        for spine in ax.spines.values():
            spine.set_color(THEME["border"])
        ax.tick_params(colors=THEME["muted"], labelsize=tick_fs)
        ax.grid(True, alpha=0.35, color=THEME["grid"])
        ax.set_title(title, color=THEME["text"], fontsize=title_fs, fontweight="bold")
        ax.set_ylabel(ylabel, color=THEME["muted"], fontsize=axis_fs)
        if show_xlabel:
            ax.set_xlabel("Time (s)", color=THEME["muted"], fontsize=axis_fs)
        if series:
            legend = ax.legend(
                fontsize=legend_fs, facecolor=THEME["bg"], edgecolor=THEME["border"],
                loc="upper left", ncol=3 if mini else 6
            )
            for text in legend.get_texts():
                text.set_color(THEME["text"])
        state = self.graph_zoom_state.get(id(ax))
        if state:
            ax.set_xlim(state[0])
            ax.set_ylim(state[1])
    
    def build_series(self, h, kind):
        c1, c2, c3 = PLOT_COLORS
        if kind == "position":
            return [
                (h["x"], "X", c1, "-", 1.0, 1.5),
                (h["y"], "Y", c2, "-", 1.0, 1.5),
                (h["z"], "Z", c3, "-", 1.0, 1.5),
                (h["target_x"], "X ref", c1, "--", 0.5, 1.0),
                (h["target_y"], "Y ref", c2, "--", 0.5, 1.0),
                (h["target_z"], "Z ref", c3, "--", 0.5, 1.0)
            ], "Position", "m"
        if kind == "attitude":
            return [
                (h["roll"], "Roll", c1, "-", 1.0, 1.5),
                (h["pitch"], "Pitch", c2, "-", 1.0, 1.5),
                (h["yaw"], "Yaw", c3, "-", 1.0, 1.5),
                (h["target_roll"], "Roll ref", c1, "--", 0.5, 1.0),
                (h["target_pitch"], "Pitch ref", c2, "--", 0.5, 1.0),
                (h["target_yaw"], "Yaw ref", c3, "--", 0.5, 1.0)
            ], "Attitude", "deg"
        return [
            (h["vx"], "Vx", c1, "-", 1.0, 1.5),
            (h["vy"], "Vy", c2, "-", 1.0, 1.5),
            (h["vz"], "Vz", c3, "-", 1.0, 1.5)
        ], "Velocity", "m/s"
    
    def update_mini_graphs(self):
        h = self.history
        axes = [self.mini_ax_position, self.mini_ax_attitude, self.mini_ax_velocity]
        for ax in axes:
            ax.clear()
        has_data = len(h["time"]) >= 2
        t = np.array(h["time"]) if has_data else np.array([0.0])
        for ax, kind in zip(axes, ("position", "attitude", "velocity")):
            series, title, ylabel = self.build_series(h, kind) if has_data else ([], "", "")
            title = {"position": "Position", "attitude": "Attitude", "velocity": "Velocity"}[kind]
            ylabel = {"position": "m", "attitude": "deg", "velocity": "m/s"}[kind]
            self.draw_series(ax, t, series, title, ylabel, mini=True, show_xlabel=False)
        self.mini_canvas.draw_idle()
    
    def update_full_graphs(self):
        h = self.history
        axes = [self.full_ax_position, self.full_ax_attitude, self.full_ax_velocity]
        for ax in axes:
            ax.clear()
        has_data = len(h["time"]) >= 2
        t = np.array(h["time"]) if has_data else np.array([0.0])
        kinds = ("position", "attitude", "velocity")
        for i, (ax, kind) in enumerate(zip(axes, kinds)):
            series, title, ylabel = self.build_series(h, kind) if has_data else ([], "", "")
            title = {"position": "Position", "attitude": "Attitude", "velocity": "Velocity"}[kind]
            ylabel = {"position": "m", "attitude": "deg", "velocity": "m/s"}[kind]
            self.draw_series(ax, t, series, title, ylabel, mini=False, show_xlabel=(i == len(axes) - 1))
        self.full_canvas.draw_idle()
    
    # ============================================================
    # SIMULATION
    # ============================================================
    
    def handle_space(self, event=None):
        focused = self.root.focus_get()
        if isinstance(focused, (tk.Entry, ttk.Entry)):
            return
        self.toggle_simulation()
    
    def toggle_simulation(self):
        self.running = not self.running
        if self.running:
            self.start_button.config(text="⏸  PAUSE", style="Danger.TButton")
            self.status_label.config(text="● RUNNING", foreground=THEME["success"])
            self.simulation_loop()
        else:
            self.start_button.config(text="▶  START", style="Primary.TButton")
            self.status_label.config(text="● PAUSED", foreground=THEME["warning"])
    
    def simulation_loop(self):
        if not self.running:
            return
        
        self.update_pid()
        speed = self.speed.get()
        self.speed_label.config(text=f"{speed:.1f}x")
        steps = max(1, int(self.steps_per_frame * speed))
        
        for _ in range(steps):
            self.simulation_step()
        
        self.update_display()
        self.root.after(30, self.simulation_loop)
    
    def update_pid(self):
        # Update controller gains from UI
        axes = ['x', 'y', 'z', 'roll', 'pitch', 'yaw']
        ui_axes = ['X', 'Y', 'Z', 'Roll', 'Pitch', 'Yaw']
        
        for axis, ui_axis in zip(axes, ui_axes):
            kp = self.pid_values[ui_axis]['kp'].get()
            ki = self.pid_values[ui_axis]['ki'].get()
            kd = self.pid_values[ui_axis]['kd'].get()
            
            # Update controller PID objects
            if axis == 'x':
                self.controller.pid_x.set_gains(kp, ki, kd)
            elif axis == 'y':
                self.controller.pid_y.set_gains(kp, ki, kd)
            elif axis == 'z':
                self.controller.pid_z.set_gains(kp, ki, kd)
            elif axis == 'roll':
                self.controller.pid_roll.set_gains(kp, ki, kd)
            elif axis == 'pitch':
                self.controller.pid_pitch.set_gains(kp, ki, kd)
            elif axis == 'yaw':
                self.controller.pid_yaw.set_gains(kp, ki, kd)
    
    def simulation_step(self):
        d = self.drone
        dt = self.dt
        
        # Compute control outputs
        thrust, roll_torque, pitch_torque, yaw_torque, yaw_target = self.controller.update(
            d,
            self.target_x.get(),
            self.target_y.get(),
            self.target_z.get(),
            self.target_roll.get(),
            self.target_pitch.get(),
            self.target_yaw.get(),
            self.auto_heading.get(),
            dt
        )
        
        # Update drone
        d.update(
            thrust, roll_torque, pitch_torque, yaw_torque,
            self.dist_x.get(), self.dist_y.get(), self.dist_z.get(),
            self.dist_roll.get(), self.dist_pitch.get(), self.dist_yaw.get(),
            dt
        )
        
        self.simulation_time += dt
        
        # Record history
        self.record(
            thrust, roll_torque, pitch_torque, yaw_torque,
            0.0, 0.0,  # desired_roll, desired_pitch (not stored here)
            0.0, 0.0,  # ax_command, ay_command
            d.motor_thrusts,
            deg(yaw_target)
        )
    
    def record(self, thrust, roll_torque, pitch_torque, yaw_torque,
               desired_roll, desired_pitch, ax_command, ay_command,
               motor_thrusts, yaw_target_deg):
        d = self.drone
        h = self.history
        
        h["time"].append(self.simulation_time)
        h["x"].append(d.x)
        h["y"].append(d.y)
        h["z"].append(d.z)
        h["target_x"].append(self.target_x.get())
        h["target_y"].append(self.target_y.get())
        h["target_z"].append(self.target_z.get())
        h["roll"].append(deg(d.roll))
        h["pitch"].append(deg(d.pitch))
        h["yaw"].append(deg(d.yaw))
        h["target_roll"].append(self.target_roll.get())
        h["target_pitch"].append(self.target_pitch.get())
        h["target_yaw"].append(yaw_target_deg)
        h["vx"].append(d.vx)
        h["vy"].append(d.vy)
        h["vz"].append(d.vz)
        h["desired_roll"].append(deg(desired_roll))
        h["desired_pitch"].append(deg(desired_pitch))
        h["ax_command"].append(ax_command)
        h["ay_command"].append(ay_command)
        h["thrust"].append(thrust)
        h["roll_torque"].append(roll_torque)
        h["pitch_torque"].append(pitch_torque)
        h["yaw_torque"].append(yaw_torque)
        h["motor1"].append(motor_thrusts[0] if len(motor_thrusts) > 0 else 0)
        h["motor2"].append(motor_thrusts[1] if len(motor_thrusts) > 1 else 0)
        h["motor3"].append(motor_thrusts[2] if len(motor_thrusts) > 2 else 0)
        h["motor4"].append(motor_thrusts[3] if len(motor_thrusts) > 3 else 0)
        h["sensor_gyro_x"].append(d.sensor_gyro[0])
        h["sensor_gyro_y"].append(d.sensor_gyro[1])
        h["sensor_gyro_z"].append(d.sensor_gyro[2])
        
        max_history = 12000
        if len(h["time"]) > max_history:
            for key in h:
                h[key] = h[key][-max_history:]
    
    # ============================================================
    # DISPLAY UPDATE
    # ============================================================
    
    def update_display(self):
        d = self.drone
        
        values = {
            "X": d.x, "Y": d.y, "Z": d.z,
            "Roll": deg(d.roll), "Pitch": deg(d.pitch), "Yaw": deg(d.yaw),
            "Vx": d.vx, "Vy": d.vy, "Vz": d.vz
        }
        for name, value in values.items():
            self.telemetry[name].set(f"{value:.3f}")
        
        error_norm = math.sqrt(
            (self.target_x.get() - d.x) ** 2 +
            (self.target_y.get() - d.y) ** 2 +
            (self.target_z.get() - d.z) ** 2
        )
        self.distance_var.set(f"{error_norm:.2f} m")
        
        # Motor thrust display
        thrusts = d.motor_thrusts
        self.motor_thrust_text.set(f"M: {thrusts[0]:.1f} {thrusts[1]:.1f} {thrusts[2]:.1f} {thrusts[3]:.1f} N")
        
        if self.running:
            if error_norm < 0.15:
                self.status_label.config(text="● ON TARGET", foreground=THEME["success"])
            else:
                self.status_label.config(text="● TRACKING", foreground=THEME["warning"])
            self.status_detail_label.config(text=f"t = {self.simulation_time:5.1f}s")
        else:
            self.status_label.config(text="● STOPPED", foreground=THEME["muted"])
            self.status_detail_label.config(text="")
        
        # Update motor bars
        max_t = self.drone_config.motor.max_thrust
        for i in range(4):
            value = thrusts[i] if i < len(thrusts) else 0
            self.motor_bars[i]["value"] = value
            saturated = value >= max_t - 1e-6
            self.motor_bars[i].configure(
                style="Saturated.Horizontal.TProgressbar" if saturated else "Horizontal.TProgressbar"
            )
            self.motor_labels[i].config(
                text=f"{value:.2f} N",
                foreground=THEME["danger"] if saturated else THEME["accent2"]
            )
        
        current_tab = self.right_notebook.index(self.right_notebook.select())
        if current_tab == 0:
            self.update_3d()
            self.update_mini_graphs()
        else:
            self.update_full_graphs()
    
    # ============================================================
    # RESET
    # ============================================================
    
    def reset(self):
        self.running = False
        self.start_button.config(text="▶  START", style="Primary.TButton")
        self.status_label.config(text="● STOPPED", foreground=THEME["muted"])
        self.status_detail_label.config(text="")
        self.simulation_time = 0.0
        self.travel_yaw_deg = 0.0
        
        self.drone.reset()
        self.controller.reset()
        
        for key in self.history:
            self.history[key].clear()
        
        self.update_display()
    
    # ============================================================
    # SAVE CSV
    # ============================================================
    
    def save_csv(self):
        if not self.history["time"]:
            messagebox.showwarning("No data", "Run the simulation first.")
            return
        filename = filedialog.asksaveasfilename(
            title="Save simulation data",
            defaultextension=".csv",
            filetypes=[("CSV files", "*.csv"), ("All files", "*.*")]
        )
        if not filename:
            return
        keys = list(self.history.keys())
        try:
            with open(filename, "w", newline="") as file:
                writer = csv.writer(file)
                writer.writerow(keys)
                rows = zip(*[self.history[key] for key in keys])
                writer.writerows(rows)
            messagebox.showinfo("CSV Export", "Simulation data successfully saved.")
        except Exception as error:
            messagebox.showerror("Error", str(error))

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
        self.controller_outputs = {
            'thrust': 0.0,
            'roll_torque': 0.0,
            'pitch_torque': 0.0,
            'yaw_torque': 0.0,
            'yaw_target': 0.0,
            'roll_control': 0.0,
            'pitch_control': 0.0,
            'yaw_control': 0.0,
            'throttle': 0.0,
        }
        self._thread = None
        self._stop_event = threading.Event()
        self._reset_state()

    def _reset_state(self):
        self.drone.reset()
        self.controller.reset()
        self.simulation_time = 0.0
        self.running = False
        self.controller_outputs = {
            'thrust': 0.0,
            'roll_torque': 0.0,
            'pitch_torque': 0.0,
            'yaw_torque': 0.0,
            'yaw_target': 0.0,
            'roll_control': 0.0,
            'pitch_control': 0.0,
            'yaw_control': 0.0,
            'throttle': 0.0,
        }

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
            self.controller.update_gains(self.config)
            self.pid = {
                'X': {'kp': 0.5, 'ki': 0.03, 'kd': 0.3},
                'Y': {'kp': 0.5, 'ki': 0.03, 'kd': 0.3},
                'Z': {'kp': 3.0, 'ki': 0.5, 'kd': 1.5},
                'Roll': {'kp': 2.5, 'ki': 0.05, 'kd': 0.3},
                'Pitch': {'kp': 2.5, 'ki': 0.05, 'kd': 0.3},
                'Yaw': {'kp': 1.5, 'ki': 0.02, 'kd': 0.2},
            }
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

        self.controller_outputs['thrust'] = thrust
        self.controller_outputs['roll_torque'] = roll_torque
        self.controller_outputs['pitch_torque'] = pitch_torque
        self.controller_outputs['yaw_torque'] = yaw_torque
        self.controller_outputs['yaw_target'] = yaw_target
        self.controller_outputs['roll_control'] = roll_torque
        self.controller_outputs['pitch_control'] = pitch_torque
        self.controller_outputs['yaw_control'] = yaw_torque
        self.controller_outputs['throttle'] = thrust / (4 * self.drone.config.motor.max_thrust)

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
        co = self.controller_outputs
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
            'roll_torque': co['roll_torque'],
            'pitch_torque': co['pitch_torque'],
            'yaw_torque': co['yaw_torque'],
            'yaw_target': co['yaw_target'],
            'roll_control': co['roll_control'],
            'pitch_control': co['pitch_control'],
            'yaw_control': co['yaw_control'],
            'throttle': co['throttle'],
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

# ============================================================
# MAIN
# ============================================================

def main():
    root = tk.Tk()
    configure_style(root)
    EnhancedDroneSimulator(root)
    root.mainloop()

def run_backend(port=8765):
    backend.run_server(port=port)

if __name__ == "__main__":
    import sys
    port = 8765
    if len(sys.argv) > 1:
        if sys.argv[1] == '--backend':
            if '--port' in sys.argv:
                port_idx = sys.argv.index('--port')
                if port_idx + 1 < len(sys.argv):
                    port = int(sys.argv[port_idx + 1])
            run_backend(port)
        else:
            main()
    else:
        main()
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import math
import csv

import numpy as np
from matplotlib.figure import Figure
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg, NavigationToolbar2Tk


# ============================================================
# UTILITIES
# ============================================================

def clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def wrap_angle(angle):
    return (angle + math.pi) % (2.0 * math.pi) - math.pi


def rad(deg_value):
    return math.radians(deg_value)


def deg(rad_value):
    return math.degrees(rad_value)


# ============================================================
# THEME
#
# A single flat background color is used for every ttk widget
# (frames, labels, labelframes) so there are no seams where a
# plain container sits inside a bordered one - sections are told
# apart with a subtle border + colored bold header text instead
# of a background color change. This is what keeps a dark theme
# looking clean in Tk instead of patchy.
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

# Distinct, high-contrast line colors for the light-themed graphs.
PLOT_COLORS = ["#0e8f83", "#d97706", "#2f6fed"]


def configure_style(root):
    """Builds a flat, light, modern ttk theme on top of 'clam'
    (the only built-in theme that lets every color below actually
    take effect cross-platform)."""

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
    style.map(
        "TButton",
        background=[("active", THEME["border"])]
    )

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
# TOOLTIP (lightweight, no extra dependencies)
# ============================================================

class Tooltip:
    """Small hover tooltip for any tk/ttk widget."""

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
# PID  (derivative-on-measurement, conditional-integration anti-windup)
# ============================================================

class PID:
    """
    Standard position-form PID with two accuracy fixes over a naive
    implementation:

    1. Derivative-on-measurement instead of derivative-on-error, so a
       step change in the setpoint doesn't cause a derivative "kick".
    2. Conditional integration anti-windup: the integral term only
       accumulates when doing so would not push the output further
       past its saturation limit. This is closer to how real flight
       controllers avoid windup than a plain clamp on the integral
       alone.

    `angle=True` treats the setpoint/measurement as angles in radians
    and wraps the error and the measurement delta to (-pi, pi], which
    matters for yaw (which can cross the +-180 deg boundary).
    """

    def __init__(
        self,
        kp,
        ki,
        kd,
        integral_limit=10.0,
        output_limit=10.0,
        angle=False
    ):
        self.kp = kp
        self.ki = ki
        self.kd = kd

        self.integral_limit = integral_limit
        self.output_limit = output_limit
        self.angle = angle

        self.integral = 0.0
        self.previous_measurement = 0.0
        self.initialized = False

        self.last_output = 0.0

    def reset(self):
        self.integral = 0.0
        self.previous_measurement = 0.0
        self.initialized = False
        self.last_output = 0.0

    def update(self, setpoint, measurement, dt):

        if dt <= 0:
            return self.last_output

        if self.angle:
            error = wrap_angle(setpoint - measurement)
        else:
            error = setpoint - measurement

        if not self.initialized:
            derivative = 0.0
            self.previous_measurement = measurement
            self.initialized = True
        else:
            if self.angle:
                d_measurement = wrap_angle(measurement - self.previous_measurement)
            else:
                d_measurement = measurement - self.previous_measurement

            # d(error)/dt = -d(measurement)/dt when the setpoint is
            # momentarily constant; this avoids the derivative kick
            # that comes from differentiating the error directly.
            derivative = -d_measurement / dt

        tentative_integral = self.integral + error * dt
        tentative_integral = clamp(
            tentative_integral,
            -self.integral_limit,
            self.integral_limit
        )

        unclamped_output = (
            self.kp * error
            + self.ki * tentative_integral
            + self.kd * derivative
        )

        already_saturating = abs(unclamped_output) > self.output_limit
        pushing_further = (unclamped_output * error) > 0

        if not (already_saturating and pushing_further):
            self.integral = tentative_integral

        output = (
            self.kp * error
            + self.ki * self.integral
            + self.kd * derivative
        )

        output = clamp(output, -self.output_limit, self.output_limit)

        self.previous_measurement = measurement
        self.last_output = output

        return output


# ============================================================
# DRONE MODEL  (quadrotor rigid body, X configuration)
# ============================================================

class Drone:

    def __init__(self):

        # Position (world frame)
        self.x = 0.0
        self.y = 0.0
        self.z = 0.0

        # Linear velocity (world frame)
        self.vx = 0.0
        self.vy = 0.0
        self.vz = 0.0

        # Attitude (roll, pitch, yaw - Euler angles, radians)
        self.roll = 0.0
        self.pitch = 0.0
        self.yaw = 0.0

        # Body-frame angular velocity (p, q, r)
        self.p = 0.0
        self.q = 0.0
        self.r = 0.0

        # Physical parameters
        self.mass = 1.0
        self.g = 9.81

        self.Ix = 0.025
        self.Iy = 0.025
        self.Iz = 0.045

        # Linear drag (opposes world-frame velocity)
        self.drag_x = 0.30
        self.drag_y = 0.30
        self.drag_z = 0.35

        self.angular_drag = 0.08

        # ----------------------------------------------------
        # Motor / actuator model (X configuration quadrotor)
        #
        # The controller asks for a total thrust plus roll/pitch/yaw
        # torques. Real quadrotors can only realize that request
        # through four motors, each of which can only push (never
        # pull) and each of which saturates at a maximum thrust.
        # Mixing the request into four motor commands - and then
        # clipping and re-deriving the *achievable* thrust/torques
        # from the clipped values - reproduces the actuator
        # saturation and cross-axis coupling that shows up on a real
        # vehicle when it is pushed hard (e.g. commanding max climb
        # and max roll at the same time leaves less roll authority).
        # ----------------------------------------------------

        self.arm_length = 0.20            # m, center to motor
        self.motor_yaw_coefficient = 0.02  # drag-torque coupling per N of thrust
        self.max_motor_thrust = 6.0        # N per motor (~2.4x thrust/weight at mass=1kg)

        self.motor_thrusts = [0.0, 0.0, 0.0, 0.0]

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

    # --------------------------------------------------------
    # Rotation matrix (body -> world), ZYX Euler convention
    # --------------------------------------------------------

    def rotation_matrix(self):

        cr = math.cos(self.roll)
        sr = math.sin(self.roll)

        cp = math.cos(self.pitch)
        sp = math.sin(self.pitch)

        cy = math.cos(self.yaw)
        sy = math.sin(self.yaw)

        Rx = np.array([
            [1, 0, 0],
            [0, cr, -sr],
            [0, sr, cr]
        ])

        Ry = np.array([
            [cp, 0, sp],
            [0, 1, 0],
            [-sp, 0, cp]
        ])

        Rz = np.array([
            [cy, -sy, 0],
            [sy, cy, 0],
            [0, 0, 1]
        ])

        return Rz @ Ry @ Rx

    # --------------------------------------------------------
    # Motor mixing + actuator saturation
    #
    # X configuration, motors numbered:
    #   M1 = front-left,  M2 = front-right
    #   M3 = rear-left,   M4 = rear-right
    # with alternating spin direction for yaw authority.
    # --------------------------------------------------------

    def mix_and_saturate(self, thrust, roll_torque, pitch_torque, yaw_torque):

        l = self.arm_length
        k = self.motor_yaw_coefficient

        T = thrust
        L = roll_torque
        M = pitch_torque
        N = yaw_torque

        m1 = T / 4.0 - L / (4.0 * l) + M / (4.0 * l) + N / (4.0 * k)
        m2 = T / 4.0 + L / (4.0 * l) + M / (4.0 * l) - N / (4.0 * k)
        m3 = T / 4.0 - L / (4.0 * l) - M / (4.0 * l) - N / (4.0 * k)
        m4 = T / 4.0 + L / (4.0 * l) - M / (4.0 * l) + N / (4.0 * k)

        motors = [
            clamp(m1, 0.0, self.max_motor_thrust),
            clamp(m2, 0.0, self.max_motor_thrust),
            clamp(m3, 0.0, self.max_motor_thrust),
            clamp(m4, 0.0, self.max_motor_thrust)
        ]

        self.motor_thrusts = motors

        thrust_actual = sum(motors)

        roll_actual = l * (-motors[0] + motors[1] - motors[2] + motors[3])
        pitch_actual = l * (motors[0] + motors[1] - motors[2] - motors[3])
        yaw_actual = k * (motors[0] - motors[1] - motors[2] + motors[3])

        return thrust_actual, roll_actual, pitch_actual, yaw_actual

    # --------------------------------------------------------
    # Dynamics
    # --------------------------------------------------------

    def update(
        self,
        thrust,
        roll_torque,
        pitch_torque,
        yaw_torque,
        disturbance_x,
        disturbance_y,
        disturbance_z,
        disturbance_roll,
        disturbance_pitch,
        disturbance_yaw,
        dt
    ):

        thrust, roll_torque, pitch_torque, yaw_torque = self.mix_and_saturate(
            thrust, roll_torque, pitch_torque, yaw_torque
        )

        # ----------------------------------------------------
        # ROTATIONAL DYNAMICS
        #
        # Full rigid-body Euler equations, including the
        # gyroscopic/inertial cross-coupling terms that a simple
        # torque/inertia model leaves out. These are what make a
        # spinning body's axes interact (e.g. yaw rate coupling
        # into roll/pitch on an asymmetric vehicle).
        # ----------------------------------------------------

        roll_acc = (
            roll_torque
            + disturbance_roll
            - self.angular_drag * self.p
            + (self.Iy - self.Iz) * self.q * self.r
        ) / self.Ix

        pitch_acc = (
            pitch_torque
            + disturbance_pitch
            - self.angular_drag * self.q
            + (self.Iz - self.Ix) * self.p * self.r
        ) / self.Iy

        yaw_acc = (
            yaw_torque
            + disturbance_yaw
            - self.angular_drag * self.r
            + (self.Ix - self.Iy) * self.p * self.q
        ) / self.Iz

        self.p += roll_acc * dt
        self.q += pitch_acc * dt
        self.r += yaw_acc * dt

        # Safety clamp: keeps a badly-tuned controller from
        # numerically diverging instead of just visibly misbehaving.
        self.p = clamp(self.p, -25.0, 25.0)
        self.q = clamp(self.q, -25.0, 25.0)
        self.r = clamp(self.r, -25.0, 25.0)

        # ----------------------------------------------------
        # BODY RATES -> EULER ANGLE RATES
        #
        # The original model integrated roll/pitch/yaw directly
        # from p/q/r, which is only correct at small angles. This
        # is the standard kinematic transformation, valid away
        # from the pitch = +-90 deg singularity (guarded below).
        # ----------------------------------------------------

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

        # Keep pitch well clear of gimbal lock (this simulator
        # targets normal flight, not aerobatics through vertical).
        self.pitch = clamp(self.pitch, rad(-89.0), rad(89.0))

        self.roll = wrap_angle(self.roll)
        self.yaw = wrap_angle(self.yaw)

        # ----------------------------------------------------
        # THRUST -> WORLD FRAME
        # ----------------------------------------------------

        R = self.rotation_matrix()

        thrust_body = np.array([0.0, 0.0, thrust])
        thrust_world = R @ thrust_body

        # ----------------------------------------------------
        # TRANSLATIONAL FORCES
        # ----------------------------------------------------

        fx = thrust_world[0] - self.drag_x * self.vx + disturbance_x
        fy = thrust_world[1] - self.drag_y * self.vy + disturbance_y
        fz = thrust_world[2] - self.mass * self.g - self.drag_z * self.vz + disturbance_z

        ax = fx / self.mass
        ay = fy / self.mass
        az = fz / self.mass

        self.vx += ax * dt
        self.vy += ay * dt
        self.vz += az * dt

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


# ============================================================
# APPLICATION
# ============================================================

class DroneSimulator:

    def __init__(self, root):

        self.root = root

        self.root.title(
            "Drone Automation & Control - 6-DOF Quadrotor Simulator"
        )

        self.root.geometry("1550x920")
        self.root.minsize(1280, 740)

        # ----------------------------------------------------
        # SIMULATION
        # ----------------------------------------------------

        self.dt = 0.01
        self.simulation_time = 0.0
        self.running = False
        self.steps_per_frame = 4

        # ----------------------------------------------------
        # DRONE
        # ----------------------------------------------------

        self.drone = Drone()

        # ----------------------------------------------------
        # PID CONTROLLERS
        # ----------------------------------------------------

        self.pid_x = PID(0.8, 0.02, 0.8, integral_limit=3, output_limit=4)
        self.pid_y = PID(0.8, 0.02, 0.8, integral_limit=3, output_limit=4)
        self.pid_z = PID(4.0, 1.0, 2.5, integral_limit=5, output_limit=8)

        self.pid_roll = PID(4.0, 0.08, 0.5, integral_limit=1, output_limit=1)
        self.pid_pitch = PID(4.0, 0.08, 0.5, integral_limit=1, output_limit=1)
        self.pid_yaw = PID(2.5, 0.03, 0.4, integral_limit=1, output_limit=1, angle=True)

        # ----------------------------------------------------
        # TARGETS
        # ----------------------------------------------------

        self.target_x = tk.DoubleVar(value=0.0)
        self.target_y = tk.DoubleVar(value=0.0)
        self.target_z = tk.DoubleVar(value=3.0)

        self.target_roll = tk.DoubleVar(value=0.0)
        self.target_pitch = tk.DoubleVar(value=0.0)
        self.target_yaw = tk.DoubleVar(value=0.0)

        # When enabled, the drone yaws to face wherever it is
        # currently flying (like a car) instead of holding the
        # heading set by the Yaw slider - this is what makes the
        # heading arrow on the 3D view visibly swing as the drone
        # moves rather than staying parallel the whole time.
        self.auto_heading = tk.BooleanVar(value=True)
        self.travel_yaw_deg = 0.0

        # Tracks manual scroll-zoom state per axis (keyed by id(ax)) so
        # a zoomed-in graph doesn't keep getting reset to auto-fit on
        # every simulation tick. Shared by the mini and full graphs.
        self.graph_zoom_state = {}

        # ----------------------------------------------------
        # DISTURBANCES
        # ----------------------------------------------------

        self.dist_x = tk.DoubleVar(value=0.0)
        self.dist_y = tk.DoubleVar(value=0.0)
        self.dist_z = tk.DoubleVar(value=0.0)

        self.dist_roll = tk.DoubleVar(value=0.0)
        self.dist_pitch = tk.DoubleVar(value=0.0)
        self.dist_yaw = tk.DoubleVar(value=0.0)

        # ----------------------------------------------------
        # PID VARIABLES
        # ----------------------------------------------------

        self.pid_values = {
            "X": {"kp": tk.DoubleVar(value=0.8), "ki": tk.DoubleVar(value=0.02), "kd": tk.DoubleVar(value=0.8)},
            "Y": {"kp": tk.DoubleVar(value=0.8), "ki": tk.DoubleVar(value=0.02), "kd": tk.DoubleVar(value=0.8)},
            "Z": {"kp": tk.DoubleVar(value=4.0), "ki": tk.DoubleVar(value=1.0), "kd": tk.DoubleVar(value=2.5)},
            "Roll": {"kp": tk.DoubleVar(value=4.0), "ki": tk.DoubleVar(value=0.08), "kd": tk.DoubleVar(value=0.5)},
            "Pitch": {"kp": tk.DoubleVar(value=4.0), "ki": tk.DoubleVar(value=0.08), "kd": tk.DoubleVar(value=0.5)},
            "Yaw": {"kp": tk.DoubleVar(value=2.5), "ki": tk.DoubleVar(value=0.03), "kd": tk.DoubleVar(value=0.4)}
        }

        self.pid_ranges = {
            "kp": (0.0, 10.0),
            "ki": (0.0, 10.0),
            "kd": (0.0, 10.0)
        }

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

        # ----------------------------------------------------
        # HISTORY
        # ----------------------------------------------------

        self.history = {
            "time": [],
            "x": [], "y": [], "z": [],
            "target_x": [], "target_y": [], "target_z": [],
            "roll": [], "pitch": [], "yaw": [],
            "target_roll": [], "target_pitch": [], "target_yaw": [],
            "vx": [], "vy": [], "vz": [],
            "desired_roll": [], "desired_pitch": [],
            "ax_command": [], "ay_command": [],
            "thrust": [],
            "roll_torque": [], "pitch_torque": [], "yaw_torque": [],
            "motor1": [], "motor2": [], "motor3": [], "motor4": []
        }

        self.build_interface()

        self.root.bind("<space>", self.handle_space)

        self.update_display()

    # ========================================================
    # KEYBOARD
    # ========================================================

    def handle_space(self, event=None):

        focused = self.root.focus_get()

        if isinstance(focused, (tk.Entry, ttk.Entry)):
            return

        self.toggle_simulation()

    # ========================================================
    # MAIN INTERFACE
    # ========================================================

    def build_interface(self):

        # ====================================================
        # TOP BAR
        # ====================================================

        top = ttk.Frame(self.root)
        top.pack(fill="x", padx=10, pady=(10, 6))

        title = ttk.Label(
            top, text="\U0001f681 DRONE CONTROL CENTER",
            font=("Segoe UI", 13, "bold"), foreground=THEME["text"]
        )
        title.pack(side="left", padx=(0, 18))

        self.start_button = ttk.Button(
            top, text="\u25b6  START", style="Primary.TButton", command=self.toggle_simulation
        )
        self.start_button.pack(side="left")
        Tooltip(self.start_button, "Start or pause the simulation (shortcut: Space)")

        reset_button = ttk.Button(top, text="\u21bb  RESET", command=self.reset)
        reset_button.pack(side="left", padx=6)
        Tooltip(reset_button, "Reset the drone, controllers and history")

        save_button = ttk.Button(top, text="\u2913  SAVE CSV", command=self.save_csv)
        save_button.pack(side="left")
        Tooltip(save_button, "Export the recorded time history to a CSV file")

        ttk.Label(top, text="   Speed:", foreground=THEME["muted"]).pack(side="left")

        speed_scale = ttk.Scale(top, from_=0.1, to=5.0, variable=self.speed, orient="horizontal", length=140)
        speed_scale.pack(side="left", padx=4)
        Tooltip(speed_scale, "How many times faster than real time the simulation runs")

        self.speed_label = ttk.Label(top, text="1.0x", foreground=THEME["muted"], width=5)
        self.speed_label.pack(side="left")

        # Status indicator, right-aligned
        self.status_detail_label = ttk.Label(top, text="", foreground=THEME["muted"])
        self.status_detail_label.pack(side="right", padx=(0, 4))

        self.status_label = ttk.Label(
            top, text="\u25cf STOPPED", font=UI_FONT_BOLD, foreground=THEME["muted"]
        )
        self.status_label.pack(side="right", padx=10)

        tk.Frame(self.root, height=1, bg=THEME["border"]).pack(fill="x", padx=10)

        # ====================================================
        # MAIN AREA
        # ====================================================

        main = ttk.Frame(self.root)
        main.pack(fill="both", expand=True, padx=10, pady=8)

        # LEFT PANEL

        self.left_panel = ttk.Frame(main, width=550)
        self.left_panel.pack(side="left", fill="y", expand=False, padx=(0, 10))
        self.left_panel.pack_propagate(False)

        # RIGHT PANEL - a notebook with two tabs:
        #   OVERVIEW - everything visible at once: a smaller 3D view,
        #     compact vertically-stacked graphs, and motor thrust bars.
        #     The small graphs support scroll-to-zoom / double-click
        #     to reset, for a quick closer look without leaving the tab.
        #   GRAPHS - the same plots, full-size and vertically stacked
        #     for legibility, with a proper zoom/pan/save toolbar for
        #     a detailed look.

        self.right_notebook = ttk.Notebook(main)
        self.right_notebook.pack(side="left", fill="both", expand=True)

        overview_tab = ttk.Frame(self.right_notebook)
        graphs_tab = ttk.Frame(self.right_notebook)

        self.right_notebook.add(overview_tab, text="\U0001f5a5  OVERVIEW")
        self.right_notebook.add(graphs_tab, text="\U0001f4c8  GRAPHS")

        # LEFT

        self.build_targets(self.left_panel)
        self.build_pid_controls(self.left_panel)
        self.build_disturbances(self.left_panel)
        self.build_telemetry(self.left_panel)

        # OVERVIEW TAB - 3D view (left) + graphs/motors (right), with a
        # draggable divider so the 3D view can be resized down further
        # if it's still taking up more room than wanted.

        overview_split = ttk.PanedWindow(overview_tab, orient="horizontal")
        overview_split.pack(fill="both", expand=True)

        view_pane = ttk.LabelFrame(overview_split, text="\U0001f6f8  3D DRONE VIEW")
        overview_split.add(view_pane, weight=1)
        self.build_3d_view(view_pane, mini=True)

        data_pane = ttk.Frame(overview_split)
        overview_split.add(data_pane, weight=1)

        # Motor thrust is packed to the bottom FIRST so it always
        # keeps its space, same fix as before for the dock buttons.

        motor_frame = ttk.LabelFrame(data_pane, text="\u2699  MOTOR THRUST / SATURATION")
        motor_frame.pack(side="bottom", fill="x", pady=(6, 0))
        self.build_motor_telemetry(motor_frame)

        mini_graph_frame = ttk.LabelFrame(data_pane, text="\U0001f4c8  SYSTEM RESPONSE")
        mini_graph_frame.pack(side="top", fill="both", expand=True)
        self.build_mini_graphs(mini_graph_frame)

        self.root.after(150, lambda: overview_split.sashpos(0, int(self.root.winfo_width() * 0.42)))

        # GRAPHS TAB - full-size, vertically stacked, with a real
        # zoom/pan/save toolbar for a detailed look.

        full_graph_frame = ttk.LabelFrame(graphs_tab, text="\U0001f4c8  SYSTEM RESPONSE \u2014 DETAILED VIEW")
        full_graph_frame.pack(fill="both", expand=True, padx=4, pady=4)
        self.build_full_graphs(full_graph_frame)

    # ========================================================
    # ZOOM (shared by the mini and full graphs)
    # ========================================================

    def register_zoom(self, canvas, axes):
        """Scroll to zoom in/out centered on the cursor; double-click
        an axis to reset it back to auto-fit. Works the same way on
        both the small overview graphs and the full detailed ones."""

        def on_scroll(event):

            ax = event.inaxes

            if ax not in axes or event.xdata is None or event.ydata is None:
                return

            factor = 0.85 if event.button == "up" else (1.0 / 0.85)

            xlim = ax.get_xlim()
            ylim = ax.get_ylim()

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

    # ========================================================
    # TARGETS
    # ========================================================

    def build_targets(self, parent):

        frame = ttk.LabelFrame(parent, text="\U0001f3af  TARGET POSITION / ATTITUDE")
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
            "When on, the drone automatically yaws to face wherever it's "
            "flying (like a car) and the heading arrow swings to match. "
            "Turn off to set yaw manually with the slider above."
        )

    # ========================================================
    # SMALL CONTROL (slider + editable exact value)
    # ========================================================

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

    # ========================================================
    # PID PANEL
    # ========================================================

    def build_pid_controls(self, parent):

        frame = ttk.LabelFrame(parent, text="\U0001f39b  PID PARAMETERS \u2014 SLIDER + EXACT VALUE")
        frame.pack(fill="x", pady=8)

        # Presets

        preset_row = ttk.Frame(frame)
        preset_row.pack(fill="x", padx=4, pady=(4, 2))

        ttk.Label(preset_row, text="Presets:").pack(side="left")

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
        Tooltip(kp_label, "Proportional gain: reacts to the current error")

        ki_label = ttk.Label(header, text="Ki", anchor="center", font=("TkDefaultFont", 9, "bold"))
        ki_label.grid(row=0, column=2, sticky="ew")
        Tooltip(ki_label, "Integral gain: eliminates steady-state error over time")

        kd_label = ttk.Label(header, text="Kd", anchor="center", font=("TkDefaultFont", 9, "bold"))
        kd_label.grid(row=0, column=3, sticky="ew")
        Tooltip(kd_label, "Derivative gain: damps the response (derivative-on-measurement)")

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

    # ========================================================
    # PRESETS
    # ========================================================

    def apply_preset(self, name):

        preset = self.pid_presets[name]

        for axis, (kp, ki, kd) in preset.items():
            self.pid_values[axis]["kp"].set(kp)
            self.pid_values[axis]["ki"].set(ki)
            self.pid_values[axis]["kd"].set(kd)

    # ========================================================
    # PID CELL (grid-based, no zero-height frames)
    # ========================================================

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

    # ========================================================
    # PID FORMAT
    # ========================================================

    def pid_format(self, value):

        if abs(value) < 0.1:
            return f"{value:.3f}"

        return f"{value:.2f}"

    # ========================================================
    # DISTURBANCES
    # ========================================================

    def build_disturbances(self, parent):

        frame = ttk.LabelFrame(parent, text="\U0001f32c  DISTURBANCES / WIND")
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

        self.small_control(right, "Roll", self.dist_roll, -0.5, 0.5, "Disturbance torque about roll axis (N\u00b7m)")
        self.small_control(right, "Pitch", self.dist_pitch, -0.5, 0.5, "Disturbance torque about pitch axis (N\u00b7m)")
        self.small_control(right, "Yaw", self.dist_yaw, -0.5, 0.5, "Disturbance torque about yaw axis (N\u00b7m)")

    # ========================================================
    # TELEMETRY
    # ========================================================

    def build_telemetry(self, parent):

        frame = ttk.LabelFrame(parent, text="\U0001f4e1  TELEMETRY")
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

        distance_row = ttk.Frame(frame)
        distance_row.grid(row=3, column=0, columnspan=3, sticky="ew", padx=4, pady=(8, 2))

        ttk.Label(distance_row, text="Distance to target:", foreground=THEME["muted"]).pack(side="left")

        self.distance_var = tk.StringVar(value="0.00 m")
        ttk.Label(
            distance_row, textvariable=self.distance_var, width=10, font=UI_FONT_BOLD,
            foreground=THEME["accent"]
        ).pack(side="right")

    # ========================================================
    # MOTOR TELEMETRY
    # ========================================================

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
                cell, maximum=self.drone.max_motor_thrust, length=130, orient="horizontal"
            )
            bar.pack(pady=6)

            label = ttk.Label(cell, text="0.00 N", font=("Segoe UI", 12, "bold"))
            label.pack()

            self.motor_bars.append(bar)
            self.motor_labels.append(label)

        note = ttk.Label(
            parent,
            text="Red = motor at max thrust (control authority lost on that axis)",
            font=UI_FONT_SMALL,
            foreground=THEME["muted"]
        )
        note.grid(row=1, column=0, columnspan=4, pady=(2, 12))

    # ========================================================
    # 3D VIEW
    # ========================================================

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

    # ========================================================
    # GRAPHS - a compact version for the Overview tab (small,
    # vertically stacked, scroll-to-zoom) and a full version for the
    # Graphs tab (large, vertically stacked, real zoom/pan toolbar).
    # Both draw from the same self.history and share the same
    # zoom-state dict via register_zoom().
    # ========================================================

    def build_mini_graphs(self, parent):

        self.mini_figure = Figure(figsize=(4.6, 7.2), dpi=88)
        self.mini_figure.patch.set_facecolor(THEME["bg"])

        self.mini_ax_position = self.mini_figure.add_subplot(311)
        self.mini_ax_attitude = self.mini_figure.add_subplot(312)
        self.mini_ax_velocity = self.mini_figure.add_subplot(313)

        self.mini_figure.subplots_adjust(
            left=0.16, right=0.97, bottom=0.05, top=0.95, hspace=0.65
        )

        self.mini_canvas = FigureCanvasTkAgg(self.mini_figure, parent)
        self.mini_canvas.get_tk_widget().configure(background=THEME["bg"], highlightthickness=0)
        self.mini_canvas.get_tk_widget().pack(fill="both", expand=True, padx=4, pady=(4, 0))

        hint = ttk.Label(
            parent, text="Scroll to zoom \u00b7 double-click an axis to reset",
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

        self.full_figure.subplots_adjust(
            left=0.08, right=0.98, bottom=0.06, top=0.96, hspace=0.5
        )

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



    # ========================================================
    # UPDATE PID GAINS FROM UI
    # ========================================================

    def update_pid(self):

        controllers = {
            "X": self.pid_x, "Y": self.pid_y, "Z": self.pid_z,
            "Roll": self.pid_roll, "Pitch": self.pid_pitch, "Yaw": self.pid_yaw
        }

        for axis, controller in controllers.items():
            controller.kp = self.pid_values[axis]["kp"].get()
            controller.ki = self.pid_values[axis]["ki"].get()
            controller.kd = self.pid_values[axis]["kd"].get()

    # ========================================================
    # START / PAUSE
    # ========================================================

    def toggle_simulation(self):

        self.running = not self.running

        if self.running:
            self.start_button.config(text="\u23f8  PAUSE", style="Danger.TButton")
            self.simulation_loop()
        else:
            self.start_button.config(text="\u25b6  START", style="Primary.TButton")
            self.status_label.config(text="\u25cf PAUSED", foreground=THEME["warning"])

    # ========================================================
    # SIMULATION LOOP
    # ========================================================

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

    # ========================================================
    # SIMULATION STEP
    # ========================================================

    def simulation_step(self):

        d = self.drone
        dt = self.dt

        # ----------------------------------------------------
        # POSITION CONTROL (world-frame acceleration commands)
        # ----------------------------------------------------

        ax_world = self.pid_x.update(self.target_x.get(), d.x, dt)
        ay_world = self.pid_y.update(self.target_y.get(), d.y, dt)

        yaw = d.yaw

        ax_body = math.cos(yaw) * ax_world + math.sin(yaw) * ay_world
        ay_body = -math.sin(yaw) * ax_world + math.cos(yaw) * ay_world

        # ----------------------------------------------------
        # POSITION -> ATTITUDE
        # ----------------------------------------------------

        desired_pitch_position = clamp(ax_body / d.g, rad(-30), rad(30))
        desired_roll_position = clamp(-ay_body / d.g, rad(-30), rad(30))

        desired_roll = clamp(
            rad(self.target_roll.get()) + desired_roll_position, rad(-35), rad(35)
        )

        desired_pitch = clamp(
            rad(self.target_pitch.get()) + desired_pitch_position, rad(-35), rad(35)
        )

        # ----------------------------------------------------
        # ATTITUDE CONTROL
        # ----------------------------------------------------

        roll_torque = self.pid_roll.update(desired_roll, d.roll, dt)
        pitch_torque = self.pid_pitch.update(desired_pitch, d.pitch, dt)

        # ----------------------------------------------------
        # HEADING (yaw target)
        #
        # With auto-heading on, the drone points toward wherever it
        # is currently flying (like a car), so the heading arrow on
        # the 3D view actively swings as the flight direction
        # changes instead of only reacting to the Yaw slider. While
        # nearly stationary (no reliable velocity direction to use)
        # it points toward the target instead of just freezing, so
        # the arrow visibly reacts the moment you drag a target
        # slider even before the drone has picked up any speed.
        # ----------------------------------------------------

        horizontal_speed = math.hypot(d.vx, d.vy)

        if self.auto_heading.get():
            if horizontal_speed > 0.05:
                self.travel_yaw_deg = deg(math.atan2(d.vy, d.vx))
            else:
                dx = self.target_x.get() - d.x
                dy = self.target_y.get() - d.y
                if math.hypot(dx, dy) > 0.05:
                    self.travel_yaw_deg = deg(math.atan2(dy, dx))

            yaw_target_deg = self.travel_yaw_deg
        else:
            yaw_target_deg = self.target_yaw.get()

        yaw_torque = self.pid_yaw.update(rad(yaw_target_deg), d.yaw, dt)

        # ----------------------------------------------------
        # ALTITUDE
        # ----------------------------------------------------

        altitude_command = self.pid_z.update(self.target_z.get(), d.z, dt)
        thrust = max(0.0, d.mass * d.g + altitude_command)

        # ----------------------------------------------------
        # DRONE (motor mixing + saturation happens inside update)
        # ----------------------------------------------------

        d.update(
            thrust,
            roll_torque, pitch_torque, yaw_torque,
            self.dist_x.get(), self.dist_y.get(), self.dist_z.get(),
            self.dist_roll.get(), self.dist_pitch.get(), self.dist_yaw.get(),
            dt
        )

        self.simulation_time += dt

        self.record(
            thrust, roll_torque, pitch_torque, yaw_torque,
            desired_roll, desired_pitch, ax_world, ay_world,
            d.motor_thrusts, yaw_target_deg
        )

    # ========================================================
    # RECORD
    # ========================================================

    def record(
        self,
        thrust,
        roll_torque,
        pitch_torque,
        yaw_torque,
        desired_roll,
        desired_pitch,
        ax_command,
        ay_command,
        motor_thrusts,
        yaw_target_deg
    ):

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

        h["motor1"].append(motor_thrusts[0])
        h["motor2"].append(motor_thrusts[1])
        h["motor3"].append(motor_thrusts[2])
        h["motor4"].append(motor_thrusts[3])

        maximum = 12000

        if len(h["time"]) > maximum:
            for key in h:
                h[key] = h[key][-maximum:]

    # ========================================================
    # DISPLAY
    # ========================================================

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
            (self.target_x.get() - d.x) ** 2
            + (self.target_y.get() - d.y) ** 2
            + (self.target_z.get() - d.z) ** 2
        )

        self.distance_var.set(f"{error_norm:.2f} m")

        if self.running:
            if error_norm < 0.15:
                self.status_label.config(text="\u25cf ON TARGET", foreground=THEME["success"])
            else:
                self.status_label.config(text="\u25cf TRACKING", foreground=THEME["warning"])

            self.status_detail_label.config(text=f"t = {self.simulation_time:5.1f}s")
        else:
            self.status_label.config(text="\u25cf STOPPED", foreground=THEME["muted"])
            self.status_detail_label.config(text="")

        current_tab = self.right_notebook.index(self.right_notebook.select())

        if current_tab == 0:
            self.update_3d()
            self.update_mini_graphs()
            self.update_motor_bars()
        else:
            self.update_full_graphs()

    def update_motor_bars(self):

        d = self.drone

        for i in range(4):
            value = d.motor_thrusts[i]
            self.motor_bars[i]["value"] = value

            saturated = value >= d.max_motor_thrust - 1e-6

            self.motor_bars[i].configure(
                style="Saturated.Horizontal.TProgressbar" if saturated else "Horizontal.TProgressbar"
            )

            self.motor_labels[i].config(
                text=f"{value:.2f} N",
                foreground=THEME["danger"] if saturated else THEME["accent2"]
            )

    # ========================================================
    # 3D DRONE
    # ========================================================

    def update_3d(self):

        ax = self.ax_3d
        d = self.drone

        ax.clear()

        # ---- dark theme styling (must be reapplied after clear()) ----

        ax.set_facecolor(THEME["bg"])

        pane_color = (0.94, 0.95, 0.98, 1.0)
        for axis in (ax.xaxis, ax.yaxis, ax.zaxis):
            axis.set_pane_color(pane_color)
            axis.line.set_color(THEME["border"])
            axis._axinfo["grid"]["color"] = THEME["grid"]

        ax.tick_params(colors=THEME["muted"], labelsize=8)

        # ----------------------------------------------------------

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

        motors = np.array([
            [arm, 0, 0], [-arm, 0, 0], [0, arm, 0], [0, -arm, 0]
        ])

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

        tx = self.target_x.get()
        ty = self.target_y.get()
        tz = self.target_z.get()

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

        ax.set_title("6-DOF QUADROTOR", fontsize=13, fontweight="bold", color=THEME["text"])
        ax.view_init(elev=25, azim=-55)

        self.canvas_3d.draw_idle()

    # ========================================================
    # GRAPHS
    # ========================================================

    def draw_series(self, ax, t, series, title, ylabel, mini, show_xlabel):
        """Plots one axis (position/attitude/velocity) for either the
        mini or full graphs, applies the theme, and re-applies any
        manual scroll-zoom the user has set on this axis instead of
        letting the next redraw snap it back to auto-fit."""

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
        """Returns the (data, label, color, linestyle, alpha, width)
        tuples for one graph kind, shared by the mini and full plots."""

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

    # ========================================================
    # RESET
    # ========================================================

    def reset(self):

        self.running = False

        self.start_button.config(text="\u25b6  START", style="Primary.TButton")
        self.status_label.config(text="\u25cf STOPPED", foreground=THEME["muted"])
        self.status_detail_label.config(text="")

        self.simulation_time = 0.0
        self.travel_yaw_deg = 0.0

        self.drone.reset()

        self.pid_x.reset()
        self.pid_y.reset()
        self.pid_z.reset()

        self.pid_roll.reset()
        self.pid_pitch.reset()
        self.pid_yaw.reset()

        for key in self.history:
            self.history[key].clear()

        self.update_display()

    # ========================================================
    # SAVE CSV
    # ========================================================

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
# MAIN
# ============================================================

def main():

    root = tk.Tk()

    configure_style(root)

    DroneSimulator(root)

    root.mainloop()


if __name__ == "__main__":
    main()
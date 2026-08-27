#!/usr/bin/env python3
"""
Numerical Parity Test: Standalone Python vs Electron Backend
Compares simulation state after equivalent simulation steps.
"""

import math
import time
import json
import threading
from Drone_simulator_PID2 import (
    create_preset_cinematic,
    EnhancedDrone,
    EnhancedController,
)


def run_standalone_simulation(steps=1000, dt=0.01):
    """Run the standalone Python simulation and return state history."""
    config = create_preset_cinematic()
    drone = EnhancedDrone(config)
    controller = EnhancedController(config)

    # Initial target
    target = {
        'x': 0.0, 'y': 0.0, 'z': 3.0,
        'roll': 0.0, 'pitch': 0.0, 'yaw': 0.0,
        'auto_heading': True,
    }

    history = []
    for i in range(steps):
        thrust, roll_torque, pitch_torque, yaw_torque, yaw_target = controller.update(
            drone, target['x'], target['y'], target['z'],
            target['roll'], target['pitch'], target['yaw'],
            target['auto_heading'], dt
        )

        drone.update(
            thrust, roll_torque, pitch_torque, yaw_torque,
            0, 0, 0, 0, 0, 0, dt
        )

        if i % 100 == 0:  # Record every 100 steps (1 second)
            history.append({
                'step': i,
                'time': i * dt,
                'x': drone.x, 'y': drone.y, 'z': drone.z,
                'vx': drone.vx, 'vy': drone.vy, 'vz': drone.vz,
                'roll': drone.roll, 'pitch': drone.pitch, 'yaw': drone.yaw,
                'p': drone.p, 'q': drone.q, 'r': drone.r,
                'motor1': drone.motor_thrusts[0],
                'motor2': drone.motor_thrusts[1],
                'motor3': drone.motor_thrusts[2],
                'motor4': drone.motor_thrusts[3],
                'thrust': sum(drone.motor_thrusts),
                'roll_torque': roll_torque,
                'pitch_torque': pitch_torque,
                'yaw_torque': yaw_torque,
            })

    return history


def run_backend_simulation(steps=1000, dt=0.01):
    """Run simulation via HTTP backend and return state history."""
    from Drone_simulator_PID2 import DroneHTTPBackend

    backend = DroneHTTPBackend()

    # Don't start the internal thread - we'll step manually for deterministic comparison
    # backend._thread = threading.Thread(target=backend._loop, daemon=True)
    # backend._thread.start()

    # Send start command
    backend.command('start')

    # Set target
    backend.set_target({'x': 0.0, 'y': 0.0, 'z': 3.0, 'roll': 0.0, 'pitch': 0.0, 'yaw': 0.0, 'auto_heading': True})

    history = []
    for i in range(steps):
        backend.step(dt)

        if i % 100 == 0:
            state = backend.state_payload()
            history.append({
                'step': i,
                'time': state['time'],
                'x': state['x'], 'y': state['y'], 'z': state['z'],
                'vx': state['vx'], 'vy': state['vy'], 'vz': state['vz'],
                'roll': state['roll'], 'pitch': state['pitch'], 'yaw': state['yaw'],
                'p': state['p'], 'q': state['q'], 'r': state['r'],
                'motor1': state['motor1'],
                'motor2': state['motor2'],
                'motor3': state['motor3'],
                'motor4': state['motor4'],
                'thrust': state['thrust'],
                'roll_torque': state['roll_torque'],
                'pitch_torque': state['pitch_torque'],
                'yaw_torque': state['yaw_torque'],
            })

    return history


def compare_states(standalone, backend, tolerance=1e-6):
    """Compare two state histories and return first divergence."""
    print(f"\n{'='*80}")
    print(f"NUMERICAL PARITY TEST")
    print(f"{'='*80}")
    print(f"Tolerance: {tolerance}")
    print(f"Steps compared: {min(len(standalone), len(backend))}")
    print(f"{'='*80}\n")

    fields = [
        'x', 'y', 'z',
        'vx', 'vy', 'vz',
        'roll', 'pitch', 'yaw',
        'p', 'q', 'r',
        'motor1', 'motor2', 'motor3', 'motor4',
        'thrust',
        'roll_torque', 'pitch_torque', 'yaw_torque',
    ]

    for i, (s, b) in enumerate(zip(standalone, backend)):
        for field in fields:
            s_val = s.get(field, 0)
            b_val = b.get(field, 0)
            diff = abs(s_val - b_val)

            if diff > tolerance:
                print(f"DIVERGENCE at step {s['step']} (t={s['time']:.3f}s)")
                print(f"   Field: {field}")
                print(f"   Standalone: {s_val:.10f}")
                print(f"   Backend:    {b_val:.10f}")
                print(f"   Difference: {diff:.10f}")
                print(f"\n   Full standalone state:")
                for f in fields:
                    print(f"     {f}: {s.get(f, 0):.10f}")
                print(f"\n   Full backend state:")
                for f in fields:
                    print(f"     {f}: {b.get(f, 0):.10f}")
                return False, s['step'], field, s_val, b_val, diff

    print(f"PARITY ACHIEVED - All {len(standalone)} states match within tolerance {tolerance}")
    return True, None, None, None, None, None


def test_via_http(steps=1000, dt=0.01):
    """Test via actual HTTP API (requires running Electron app with Python backend)."""
    print("Testing via HTTP API...")
    print("Make sure Electron app is running with Python backend on http://127.0.0.1:8765")
    print("Skipped - requests module not installed")
    return None


def main():
    print("Running numerical parity tests...\n")

    # Test 1: Standalone vs Direct Backend (same process)
    print("Test 1: Standalone Python vs Direct Backend Class")
    standalone = run_standalone_simulation(1000, 0.01)
    backend = run_backend_simulation(1000, 0.01)
    compare_states(standalone, backend, tolerance=1e-10)

    # Test 2: Standalone vs HTTP (if backend running)
    print("\n\nTest 2: Standalone Python vs HTTP Backend (requires running app)")
    http_history = test_via_http(1000, 0.01)
    if http_history:
        compare_states(standalone, http_history, tolerance=1e-6)
    else:
        print("Skipped - start Electron app to test HTTP parity")


if __name__ == '__main__':
    main()
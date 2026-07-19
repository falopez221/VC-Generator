# Synthetic Aerial Systems Simulation — public architecture

## Purpose and boundary

This module is an academic, browser-local simulation of motion, observation,
estimation, uncertainty and constrained allocation in a normalized fictional
space. It is a public explanatory surface inside Venture Governance System™.

All objects, sensors, zones, trajectories and resources are synthetic. The
module does not accept external feeds, geographic coordinates, uploads, remote
URLs or executable input. It does not model weapons, interceptors, guidance,
target acquisition, fire control or operational procedures. Its allocation
result is a mathematical capacity exercise and cannot authorize real-world
action.

The large private capability library referenced by the product remains outside
this repository. The public simulation exposes only the four agents allowed by
the repository policy.

## Existing architecture map

| Surface | Current responsibility | Simulation integration |
| --- | --- | --- |
| `app/lab` | Public, limited Lab routes | Adds one bounded simulation route |
| `src/lab` | Seeded models, exports, storage and human review | Hosts the pure simulation engine and client workbench |
| `src/styles` | Shared public and Lab presentation | Adds a Lab-specific simulation stylesheet |
| `tests` | Unit, policy and rendered-route checks | Adds deterministic mathematical and route coverage |
| `.openai/hosting.json` | Sites deployment contract | Unchanged; no database or object storage is required |

The public implementation is intentionally browser-local. It needs no API key,
authentication, database, WebSocket service or background worker. A discrete
client clock provides play, pause, step and replay behavior without presenting
the demo as a production real-time system.

## Public capability inventory

The public registry implements the shape requested by the source brief while
preserving the four-agent rule:

| Agent | Public domains | Supported simulation tasks | Independent checks |
| --- | --- | --- | --- |
| Mathematics | probability, numerical methods, estimation | integration, Kalman update, Monte Carlo, covariance | finite values, dimensional labels, PSD covariance, seeded replay |
| Finance | constrained allocation, cost | abstract capacity allocation and residual exposure | capacity bounds, cost reconciliation, no operational semantics |
| Strategy | scenario analysis, resilience | scenario configuration, saturation and trade-off analysis | assumption coverage, sensitivity and limit checks |
| Marketing | explanation, adoption | three-level explanations and accessible summaries | language clarity, synthetic-data and uncertainty labels |

Each capability record includes inputs, outputs, dependencies, visible demo
cost, visible latency estimate, confidence and validation capabilities. The
orchestrator activates a subset of these four agents according to the selected
analysis mode. It never fabricates public specialist identities to imitate the
private registry.

## Target data flow

```text
validated scenario + reproducible seed
  -> normalized 2D truth model
  -> synthetic observations (noise, misses, false observations)
  -> statistical gating and constant-velocity Kalman estimate
  -> probabilistic projection and impact samples
  -> fictional-zone risk and abstract capacity allocation
  -> independent numerical checks
  -> inspectable audit entries and downloadable synthetic results
```

Truth, observation, estimate and projection are kept as separate structures and
rendered as separate layers. Every run carries its seed, model version,
assumptions, units, warnings and validation result.

## Mathematical models

The public engine uses normalized distance units (`u`), seconds (`s`) and
abstract cost units (`acu`). This prevents results from being mistaken for
operational coordinates or equipment specifications.

- Motion: bounded two-dimensional kinematics with Euler, improved Euler and
  fourth-order Runge–Kutta integration.
- Observation: seeded Gaussian noise generated from a uniform pseudo-random
  stream, bounded detection probability and explicit false observations.
- Association: nearest-neighbour selection inside a configurable Mahalanobis
  gate; ambiguity is disclosed rather than hidden.
- Estimation: a constant-velocity linear Kalman predict/update cycle with
  symmetric covariance stabilization.
- Prediction: a mean path plus time-growing covariance. Confidence regions are
  distributions, not a single claimed impact point.
- Monte Carlo: capped, seeded samples with percentiles, standard error,
  fictional-zone intersection rates and a convergence trace.
- Risk: an explainable bounded composition of intersection probability,
  fictional criticality, uncertainty penalty, time pressure and track
  reliability.
- Allocation: a transparent greedy baseline over abstract resource capacity;
  it exposes objective contributions and residual risk and has no weapon or
  interception semantics.
- Saturation: synthetic workload curves for error, latency, throughput and
  recovery. Browser estimates are demonstrative and explicitly labelled, not
  infrastructure benchmarks.

## Dynamic public orchestration

Selection is based on declared task needs rather than agent count:

- Live and replay activate Mathematics and Strategy.
- Monte Carlo adds Finance for budget/capacity trade-offs.
- Allocation activates Mathematics, Finance and Strategy.
- Executive explanation activates Marketing after numeric validation.
- Audit mode shows producer/validator separation as roles within the four
  allowed public agents; it does not invent extra public agents.

Execution remains a deterministic function graph. Parallel-looking activity in
the interface is a visualization of independent pure calculations, not a claim
that private agents or external models are running.

## Validation criteria

1. Identical bounded inputs and seed produce identical results.
2. All probabilities remain in `[0, 1]`; scores remain in `[0, 100]`.
3. State and covariance values are finite; covariance diagonals are positive.
4. Integrator comparison reports divergence and never silently chooses a
   winner.
5. Kalman updates reduce position uncertainty under a valid observation.
6. Monte Carlo sample count and client workload are hard-capped.
7. Truth, observation, estimate and projection remain distinguishable.
8. Weak evidence or high uncertainty prevents an unqualified high-risk claim.
9. Allocation never exceeds synthetic capacity and always reports unassigned
   demand.
10. Rejected or warning-level checks remain visible in the audit log.

Validation states are `validated`, `validated_with_warnings`, `inconclusive`
and `rejected`.

## Public mathematical references

- [FilterPy Kalman filter documentation](https://filterpy.readthedocs.io/en/latest/kalman/KalmanFilter.html)
  defines the public predict/update state and covariance contract used as a
  cross-check for the browser implementation.
- [NIST TN 1297 — law of propagation of uncertainty](https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-appendix-law-propagation-uncertainty)
  supports the covariance-based first-order uncertainty explanation.
- [NIST TN 1900](https://nvlpubs.nist.gov/nistpubs/technicalnotes/nist.tn.1900.pdf)
  motivates Monte Carlo propagation when nonlinear behavior or non-Gaussian
  output makes a symmetric first-order interval inadequate.
- [MIT OpenCourseWare — Runge–Kutta methods](https://ocw.mit.edu/courses/16-346-astrodynamics-fall-2008/resources/lec_33/)
  provides the numerical-integration reference used for the RK4 comparison.
- [Piché, *Online tests of Kalman filter consistency*](https://doi.org/10.1002/acs.2571)
  provides the NIS/NEES consistency-test reference. These tests are presented
  as conditional on model assumptions, never as proof of real-world accuracy.

These sources validate mathematical definitions and numerical checks only.
They do not validate operational performance or suitability for real systems.

## Accumulative implementation plan

1. **Foundation:** public contracts, seeded generator, bounded physics, sensor,
   Kalman estimate, prediction and unit tests.
2. **Governance:** four-agent registry, task selection, audit records,
   validation classifications and limitations.
3. **Analysis:** model comparison, capped Monte Carlo, fictional risk,
   saturation and abstract allocation.
4. **Experience:** responsive workbench, layer controls, playback, research and
   executive modes, local snapshots and JSON/CSV export.
5. **Verification:** type checking, policy tests, route rendering, production
   build and deployment validation.

## Risks and assumptions

- A browser-only demo cannot reproduce the scale or scheduling behavior of a
  distributed simulation system. Saturation results are explanatory estimates.
- A constant-velocity estimator is intentionally limited under sharp
  manoeuvres. Model mismatch appears as innovation and uncertainty.
- Normalized 2D motion is not a high-fidelity atmospheric model. Integrator
  comparison demonstrates numerical methods rather than operational physics.
- Synthetic confidence is conditional on the configured model and noise. It is
  not a calibrated probability about the real world.
- Local persistence is device-specific and must never be described as durable
  institutional storage.

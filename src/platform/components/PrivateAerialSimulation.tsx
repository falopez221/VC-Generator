import { AerialSimulationLab } from "@/src/lab/components/AerialSimulationLab";

/**
 * Dedicated, authenticated presentation of the bounded aerial simulation engine.
 *
 * Access enforcement stays server-side in the protected route and its lab gate;
 * this component only presents the verified private session and model boundary.
 */
export function PrivateAerialSimulation() {
  return (
    <section
      className="private-aerial-simulation"
      aria-labelledby="private-aerial-simulation-title"
      data-classification="private-authenticated"
    >
      <header className="platform-page-heading">
        <div>
          <p>PRIVATE / DEDICATED LAB</p>
          <h1 id="private-aerial-simulation-title">Aerial resilience workspace</h1>
        </div>
        <p>
          A separate lab credential and authorization scope protect this workspace
          beyond general private-platform access.
        </p>
      </header>

      <div className="private-workflow-notice" role="note" aria-label="Access and model boundary">
        <strong>LAB SESSION VERIFIED</strong>
        <span>
          Dedicated lab credential verified server-side. Access expires automatically
          and remains bound to the current workspace identity.
        </span>
        <form className="private-aerial-lock" method="post" action="/api/private/aerial-simulation/session">
          <input type="hidden" name="action" value="lock" />
          <button className="platform-secondary-button" type="submit">Lock lab session</button>
        </form>
      </div>

      <section className="platform-panel" aria-labelledby="private-aerial-boundary-title">
        <header>
          <div>
            <span>PRIVATE SESSION · SYNTHETIC · NON-OPERATIONAL</span>
            <h2 id="private-aerial-boundary-title">Private access does not expand operational authority</h2>
          </div>
        </header>
        <p className="platform-caveat">
          The workspace uses normalized fictitious data, reproducible seeds and a
          bounded mathematical core for human review.
        </p>
        <ul className="platform-rule-list">
          <li>No real geography, live feeds, weapons, physical control or operational instructions.</li>
          <li>The only visible specialist perspectives are Mathematics, Finance, Strategy and Marketing.</li>
          <li>No private prompts, hidden agent network or proprietary orchestration are exposed.</li>
          <li>Outputs remain synthetic estimates; no run authorizes a real-world decision.</li>
        </ul>
      </section>

      <aside className="private-aerial-capacity" role="note" aria-label="Private capacity reference">
        <div>
          <span>Private agent-capacity reference</span>
          <strong>1,920</strong>
        </div>
        <p>
          Fixed private configuration reference. It is not a live inventory, deployment,
          allocation, readiness signal, or authorization; this workspace still exposes
          only the four bounded analytical perspectives shown below.
        </p>
      </aside>

      <section className="private-aerial-mathematics" aria-labelledby="private-aerial-mathematics-title">
        <header>
          <div>
            <span>MATHEMATICAL READING</span>
            <h2 id="private-aerial-mathematics-title">The demonstrative model, line by line</h2>
          </div>
          <p>Every variable below is dimensionless and synthetic. The terrain texture does not enter any equation.</p>
        </header>
        <ol>
          <li>
            <span>01</span>
            <div>
              <h3>State vector</h3>
              <p className="private-aerial-equation"><i>s</i><sub>k</sub> = [<i>x</i><sub>k</sub>, <i>y</i><sub>k</sub>, <i>v</i><sub>x,k</sub>, <i>v</i><sub>y,k</sub>]<sup>T</sup></p>
              <p><b>Read it as:</b> position in a normalized plane plus the two components of normalized velocity at step <i>k</i>.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Bounded dynamics</h3>
              <p className="private-aerial-equation">d<i>s</i>/d<i>t</i> = [<i>v</i><sub>x</sub>, <i>v</i><sub>y</sub>, <i>f</i><sub>x</sub> − <i>d</i><i>v</i><sub>x</sub> − <i>r</i><i>x</i>, <i>f</i><sub>y</sub> − <i>d</i><i>v</i><sub>y</sub> − <i>r</i><i>y</i>]<sup>T</sup></p>
              <p><b>Read it as:</b> synthetic forcing <i>f</i>, damping <i>d</i> and a restoring term <i>r</i> define only a bounded visual motion field.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>RK4 propagation</h3>
              <p className="private-aerial-equation"><i>k</i><sub>1</sub> = <i>f</i>(<i>s</i><sub>k</sub>), <i>k</i><sub>2</sub> = <i>f</i>(<i>s</i><sub>k</sub> + Δ<i>t</i><i>k</i><sub>1</sub>/2), <i>k</i><sub>3</sub> = <i>f</i>(<i>s</i><sub>k</sub> + Δ<i>t</i><i>k</i><sub>2</sub>/2), <i>k</i><sub>4</sub> = <i>f</i>(<i>s</i><sub>k</sub> + Δ<i>t</i><i>k</i><sub>3</sub>)</p>
              <p className="private-aerial-equation"><i>s</i><sub>k+1</sub> = <i>s</i><sub>k</sub> + Δ<i>t</i>(<i>k</i><sub>1</sub> + 2<i>k</i><sub>2</sub> + 2<i>k</i><sub>3</sub> + <i>k</i><sub>4</sub>)/6</p>
              <p><b>Read it as:</b> four slope evaluations form the deterministic reference propagation; Euler and Heun remain visible only as numerical comparisons.</p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <h3>Observation model</h3>
              <p className="private-aerial-equation"><i>z</i><sub>k</sub> = <i>H</i><i>s</i><sub>k</sub> + <i>v</i><sub>k</sub>, &nbsp; <i>H</i> = [[1, 0, 0, 0], [0, 1, 0, 0]]</p>
              <p><b>Read it as:</b> the observation sees position only. <i>v</i><sub>k</sub> is seeded, bounded synthetic measurement noise; a run may also contain misses or unrelated observations.</p>
            </div>
          </li>
          <li>
            <span>05</span>
            <div>
              <h3>Predict, gate and associate</h3>
              <p className="private-aerial-equation">ŝ<sup>−</sup><sub>k</sub> = <i>F</i>ŝ<sub>k−1</sub>, &nbsp; <i>P</i><sup>−</sup><sub>k</sub> = <i>F</i><i>P</i><sub>k−1</sub><i>F</i><sup>T</sup> + <i>Q</i></p>
              <p className="private-aerial-equation"><i>d</i><sub>M</sub><sup>2</sup> = (<i>z</i> − <i>H</i>ŝ<sup>−</sup>)<sup>T</sup><i>S</i><sup>−1</sup>(<i>z</i> − <i>H</i>ŝ<sup>−</sup>) ≤ <i>g</i>, &nbsp; <i>S</i> = <i>H</i><i>P</i><sup>−</sup><i>H</i><sup>T</sup> + <i>R</i></p>
              <p><b>Read it as:</b> project the estimate, compute its covariance, then accept only measurements inside the configured Mahalanobis gate. The public core uses a deterministic greedy nearest admissible match.</p>
            </div>
          </li>
          <li>
            <span>06</span>
            <div>
              <h3>Kalman correction</h3>
              <p className="private-aerial-equation"><i>K</i><sub>k</sub> = <i>P</i><sup>−</sup><i>H</i><sup>T</sup><i>S</i><sup>−1</sup>, &nbsp; ŝ<sub>k</sub> = ŝ<sup>−</sup><sub>k</sub> + <i>K</i><sub>k</sub>(<i>z</i><sub>k</sub> − <i>H</i>ŝ<sup>−</sup><sub>k</sub>)</p>
              <p className="private-aerial-equation"><i>P</i><sub>k</sub> = (<i>I</i> − <i>K</i><i>H</i>)<i>P</i><sup>−</sup>(<i>I</i> − <i>K</i><i>H</i>)<sup>T</sup> + <i>K</i><i>R</i><i>K</i><sup>T</sup></p>
              <p><b>Read it as:</b> the innovation is weighted by relative uncertainty. The covariance update is Joseph form, preserving a positive semidefinite matrix under floating-point error.</p>
            </div>
          </li>
          <li>
            <span>07</span>
            <div>
              <h3>Uncertainty ellipse</h3>
              <p className="private-aerial-equation"><i>a</i><sub>95</sub> = √[−2 ln(1 − 0.95)] √λ<sub>max</sub>, &nbsp; <i>b</i><sub>95</sub> = √[−2 ln(1 − 0.95)] √λ<sub>min</sub></p>
              <p><b>Read it as:</b> λ<sub>max</sub> and λ<sub>min</sub> are the eigenvalues of the 2×2 position covariance block. The visible ellipse communicates estimator spread, not a physical footprint.</p>
            </div>
          </li>
          <li>
            <span>08</span>
            <div>
              <h3>Seeded Monte Carlo</h3>
              <p className="private-aerial-equation">ŝ<sup>(j)</sup> = ŝ + <i>L</i>ε<sup>(j)</sup>, &nbsp; ε<sup>(j)</sup> ∼ N(0, <i>I</i>), &nbsp; <i>L</i><i>L</i><sup>T</sup> = <i>P</i><sub>xy</sub></p>
              <p><b>Read it as:</b> the lower-triangular factor <i>L</i> maps standard-normal draws into the current 2D position covariance. The 600 seeded draws produce P10, P50 and P90 of the demonstrative stress index.</p>
            </div>
          </li>
          <li>
            <span>09</span>
            <div>
              <h3>Visible demo index and review bound</h3>
              <p className="private-aerial-equation"><i>R</i> = 0.25<i>P</i><sub>prox</sub> + 0.20<i>M</i><sub>motion</sub> + 0.20<i>U</i> + 0.25<i>C</i> + 0.10<i>E</i><sub>penalty</sub></p>
              <p className="private-aerial-equation"><i>A</i> = Top<sub><i>C</i></sub>{<i>i</i> : <i>R</i><sub>i</sub> ≥ τ}</p>
              <p><b>Read it as:</b> those are fixed fictitious weights and an abstract capacity allocation only. No output triggers a real-world action, instruction or authorization.</p>
            </div>
          </li>
        </ol>
      </section>

      <div aria-label="Authenticated aerial simulation demonstrator">
        <AerialSimulationLab surface="private" />
      </div>
    </section>
  );
}

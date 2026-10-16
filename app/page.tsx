
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Candidate = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
};

type ScreeningResult = {
  filename: string;
  match_score: number;
  required_skills: string[];
  matched_skills: string[];
  missing_skills: string[];
  message: string;
};

const API_URL = "https://hireflow-backend-2.onrender.com";
const statuses = ["Under Review", "Shortlisted", "Rejected", "Hired"];

export default function Home() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("Under Review");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Resume screening state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [screening, setScreening] = useState(false);
  const [screeningResult, setScreeningResult] =
    useState<ScreeningResult | null>(null);
  const [screeningError, setScreeningError] = useState("");

  // Load candidates from FastAPI
  const loadCandidates = useCallback(async () => {
    try {
      setError("");

      const response = await fetch(`${API_URL}/candidates`);

      if (!response.ok) {
        throw new Error("Could not load candidates.");
      }

      const data: Candidate[] = await response.json();
      setCandidates(data);
    } catch {
      setError(
        "Cannot connect to the backend. Make sure FastAPI is running on port 8000."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  // Add a new candidate
  async function addCandidate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API_URL}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Failed to add candidate. Please check the details."
        );
      }

      setCandidates((previous) => [data, ...previous]);
      setName("");
      setEmail("");
      setRole("");
      setStatus("Under Review");
      setNotice("Candidate added successfully!");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  // Update candidate hiring status
  async function updateStatus(id: number, newStatus: string) {
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API_URL}/candidates/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Could not update candidate status."
        );
      }

      setCandidates((previous) =>
        previous.map((candidate) =>
          candidate.id === id ? data : candidate
        )
      );

      setNotice("Candidate status updated!");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update status."
      );
    }
  }

  // Screen a resume against a job description
  async function screenResume(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setScreeningError("");
    setScreeningResult(null);

    if (!resumeFile) {
      setScreeningError("Please select a PDF or DOCX resume.");
      return;
    }

    if (resumeFile.size > 5 * 1024 * 1024) {
      setScreeningError("The resume file must be 5 MB or smaller.");
      return;
    }

    if (!jobDescription.trim()) {
      setScreeningError("Please enter a job description.");
      return;
    }

    setScreening(true);

    const formData = new FormData();
    formData.append("resume", resumeFile);
    formData.append("job_description", jobDescription);

    try {
      const response = await fetch(`${API_URL}/screen-resume`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Resume screening failed. Check the file and try again."
        );
      }

      setScreeningResult(data as ScreeningResult);
    } catch (err) {
      setScreeningError(
        err instanceof Error
          ? err.message
          : "Could not connect to the screening service."
      );
    } finally {
      setScreening(false);
    }
  }

  const shortlisted = candidates.filter(
    (candidate) => candidate.status === "Shortlisted"
  ).length;

  const hired = candidates.filter(
    (candidate) => candidate.status === "Hired"
  ).length;

  const underReview = candidates.filter(
    (candidate) => candidate.status === "Under Review"
  ).length;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        {/* Header */}
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
              Recruitment Intelligence
            </p>

            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Hire<span className="text-cyan-400">Flow</span>
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              AI Recruitment & Applicant Tracking System
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <p className="text-xs text-slate-400">System status</p>
            <p className="mt-1 font-semibold text-emerald-400">
              ● Recruitment dashboard
            </p>
          </div>
        </header>

        {/* Dashboard statistics */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Candidates", value: candidates.length },
            { label: "Under Review", value: underReview },
            { label: "Shortlisted", value: shortlisted },
            { label: "Hired", value: hired },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
            >
              <p className="text-sm text-slate-400">{item.label}</p>
              <p className="mt-3 text-3xl font-bold">{item.value}</p>

              <div className="mt-4 h-1 w-full rounded-full bg-slate-800">
                <div className="h-1 w-1/2 rounded-full bg-cyan-400" />
              </div>
            </div>
          ))}
        </section>

        {/* Resume screening */}
        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
              Candidate Intelligence
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              AI Resume Screening
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Upload a resume to compare its technical skills against a job
              description.
            </p>
          </div>

          <form
            onSubmit={screenResume}
            className="grid gap-5 lg:grid-cols-2"
          >
            <div>
              <label
                htmlFor="resume"
                className="mb-2 block text-sm text-slate-300"
              >
                Upload resume (PDF or DOCX)
              </label>

              <input
                id="resume"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                required
                onChange={(event) => {
                  setResumeFile(event.target.files?.[0] ?? null);
                  setScreeningResult(null);
                  setScreeningError("");
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-400 file:px-3 file:py-2 file:font-semibold file:text-slate-950"
              />

              <p className="mt-2 text-xs text-slate-500">
                Maximum file size: 5 MB. Text-based documents work best.
              </p>
            </div>

            <div>
              <label
                htmlFor="job-description"
                className="mb-2 block text-sm text-slate-300"
              >
                Job description
              </label>

              <textarea
                id="job-description"
                required
                rows={5}
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Example: Python developer with FastAPI, PostgreSQL, SQL, Git and REST API skills..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm outline-none focus:border-cyan-400"
              />
            </div>

            <div className="lg:col-span-2">
              <button
                type="submit"
                disabled={screening}
                className="w-full rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60 sm:w-auto"
              >
                {screening ? "Analyzing resume..." : "Analyze Resume"}
              </button>
            </div>
          </form>

          {screeningError && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
            >
              {screeningError}
            </p>
          )}

          {screeningResult && (
            <div className="mt-7 border-t border-slate-800 pt-6">
              <div className="grid gap-5 md:grid-cols-[180px_1fr]">
                <div className="flex flex-col items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-6">
                  <p className="text-sm text-slate-400">Skills match</p>

                  <p className="mt-2 text-5xl font-bold text-cyan-300">
                    {screeningResult.match_score}%
                  </p>

                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-cyan-400"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, screeningResult.match_score)
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="break-all text-lg font-semibold">
                    {screeningResult.filename}
                  </h3>

                  <p className="mt-1 text-sm text-slate-400">
                    {screeningResult.message}
                  </p>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <h4 className="mb-3 font-semibold text-emerald-300">
                        Matched skills (
                        {screeningResult.matched_skills.length})
                      </h4>

                      <div className="flex flex-wrap gap-2">
                        {screeningResult.matched_skills.length > 0 ? (
                          screeningResult.matched_skills.map((skill) => (
                            <span
                              key={skill}
                              className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300"
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">
                            No matching skills found.
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-3 font-semibold text-amber-300">
                        Missing skills (
                        {screeningResult.missing_skills.length})
                      </h4>

                      <div className="flex flex-wrap gap-2">
                        {screeningResult.missing_skills.length > 0 ? (
                          screeningResult.missing_skills.map((skill) => (
                            <span
                              key={skill}
                              className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-sm text-amber-300"
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">
                            No missing skills detected.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-6 text-xs leading-5 text-slate-500">
                This score measures overlap with recognized technical skills
                only. It does not assess overall candidate suitability.
                Results should be reviewed by a human recruiter.
              </p>
            </div>
          )}
        </section>

        {/* Add candidate and recent candidates */}
        <section className="mb-8 grid items-start gap-6 lg:grid-cols-[0.85fr_1.5fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold">Add Candidate</h2>

            <p className="mb-6 mt-2 text-sm text-slate-400">
              Add an applicant to your recruitment pipeline.
            </p>

            <form onSubmit={addCandidate} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Full name
                </label>

                <input
                  id="name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-400"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="rahul@example.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-400"
                />
              </div>

              <div>
                <label
                  htmlFor="role"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Job role
                </label>

                <input
                  id="role"
                  required
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  placeholder="e.g. Python Developer"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-400"
                />
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="mb-2 block text-sm text-slate-300"
                >
                  Initial status
                </label>

                <select
                  id="status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
                >
                  {statuses.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Adding candidate..." : "+ Add Candidate"}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Recent Candidates</h2>

                <p className="mt-1 text-sm text-slate-400">
                  Applicants stored in your PostgreSQL database
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  void loadCandidates();
                }}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm transition hover:border-cyan-400"
              >
                Refresh
              </button>
            </div>

            {error && (
              <p
                role="alert"
                className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
              >
                {error}
              </p>
            )}

            {notice && (
              <p
                role="status"
                className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300"
              >
                {notice}
              </p>
            )}

            {loading ? (
              <p className="py-10 text-center text-slate-400">
                Loading candidates...
              </p>
            ) : candidates.length === 0 ? (
              <p className="py-10 text-center text-slate-400">
                No candidates yet. Add your first applicant using the form.
              </p>
            ) : (
              <div className="space-y-3">
                {candidates.map((candidate) => (
                  <article
                    key={candidate.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 font-bold text-cyan-300">
                          {candidate.name.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <h3 className="font-semibold">{candidate.name}</h3>

                          <p className="mt-1 break-all text-sm text-slate-400">
                            {candidate.email}
                          </p>

                          <p className="mt-2 text-sm text-cyan-300">
                            {candidate.role}
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                        #{candidate.id}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                      <span className="text-sm text-slate-400">
                        Hiring status
                      </span>

                      <select
                        aria-label={`Hiring status for ${candidate.name}`}
                        value={candidate.status}
                        onChange={(event) =>
                          void updateStatus(candidate.id, event.target.value)
                        }
                        className="max-w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan-400"
                      >
                        {statuses.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-800 py-6 text-center text-sm text-slate-500">
          HireFlow · AI Recruitment & ATS · Built with Next.js, FastAPI and PostgreSQL
        </footer>
      </div>
    </main>
  );
}

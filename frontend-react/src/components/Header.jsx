import { useState } from "react";
import appraisalService from "../services/appraisalService";
import logo from "../assets/company-logo.png";

export default function Header() {
  const [name, setName] = useState("");
  const [searching, setSearching] = useState(false);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    const query = name.trim();
    if (!query) {
      setRows(null);
      setError("Enter an employee name to search.");
      return;
    }
    setSearching(true);
    setError("");
    try {
      setRows(await appraisalService.searchAppraisals(query));
    } catch (requestError) {
      setRows(null);
      setError(requestError.response?.data?.message || "Search failed. Check the backend connection.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <header className="page-header">
      <div className="page-header-top-row">
        <img className="page-header-logo" src={logo} alt="UX Interfacely logo" />

        <div className="history-search-block">
          <label className="history-search-label" htmlFor="searchName">
            Find a Previously Generated Letter
          </label>
          <div className="history-search-row">
            <input
              id="searchName"
              type="text"
              placeholder="Search by employee name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSearch()}
            />
            <button type="button" className="btn-primary" disabled={searching} onClick={handleSearch}>
              {searching ? "Searching..." : "Search"}
            </button>
          </div>

          <div className="search-results">
            {error && <p className="search-empty">{error}</p>}
            {rows && rows.length === 0 && (
              <p className="search-empty">No matching appraisal letters found.</p>
            )}
            {rows && rows.map((row) => (
              <div className="search-result-row" key={row.id}>
                <div>
                  <strong>{row.employeeName}</strong> — {row.designation} · {row.status}
                </div>
                <button type="button" onClick={() => appraisalService.downloadPdf(row.id)}>
                  Download PDF
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h1 className="gradient-title">Appraisal Letter Generator</h1>
      <p className="page-subtitle">Generate, store and send employee appraisal letters</p>
    </header>
  );
}
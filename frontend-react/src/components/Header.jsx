import React from "react";
import CompanyLogo from "./CompanyLogo";

export default function Header() {
  return (
    <header className="app-header">
      <CompanyLogo />
      <div>
        <h2>Employee Appraisal Management</h2>
        <p>UXINTERFACELY IT SOLUTIONS LLP</p>
      </div>
    </header>
  );
}
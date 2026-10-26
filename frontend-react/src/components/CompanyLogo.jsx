import React from "react";
import logo from "../assets/company-logo.png";

export default function CompanyLogo() {
  return (
    <img
      src={logo}
      alt="Company Logo"
      className="company-logo"
    />
  );
}
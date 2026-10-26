import Header from "../components/Header";
import AppraisalForm from "../components/AppraisalForm";
import "../styles/App.css";
import "../styles/AppraisalLetter.css";

export default function AppraisalPage() {
  return (
    <div className="app">
      <Header />
      <AppraisalForm />
    </div>
  );
}

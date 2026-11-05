import { useState } from "react";
import axios from "axios";

function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    axios
      .post("/api/auth/register", { name, email, password, role })
      .then((res) => {
        setIsError(false);
        setMessage(res.data.message + " You can now log in.");
        setName("");
        setEmail("");
        setPassword("");
        setRole("student");
      })
      .catch((err) => {
        setIsError(true);
        setMessage(
          err.response?.data?.message || "Could not register. Is the server running?"
        );
      });
  }

  return (
    <form className="register-form" onSubmit={handleSubmit}>
      <h3>Campus Registration</h3>

      <label>Name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} required />

      <label>Email</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <label>Password (at least 6 characters)</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
      />

      <label>Role</label>
      <div className="role-selector">
        <label className="role-option">
          <input
            type="radio"
            name="role"
            value="student"
            checked={role === "student"}
            onChange={(e) => setRole(e.target.value)}
          />
          Student
        </label>
        <label className="role-option">
          <input
            type="radio"
            name="role"
            value="teacher"
            checked={role === "teacher"}
            onChange={(e) => setRole(e.target.value)}
          />
          Teacher / Staff
        </label>
      </div>

      {role === "teacher" && (
        <p className="role-hint">
          ⭐ Teacher orders receive priority in the queue if placed within 60s of student orders.
        </p>
      )}

      <button type="submit">Register</button>

      {message && (
        <p style={{ color: isError ? "#dc2626" : "#16a34a" }}>{message}</p>
      )}
    </form>
  );
}

export default RegisterForm;

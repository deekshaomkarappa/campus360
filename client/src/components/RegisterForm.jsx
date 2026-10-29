import { useState } from "react";
import axios from "axios";

function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    axios
      .post("/api/auth/register", { name, email, password })
      .then((res) => {
        setIsError(false);
        setMessage(res.data.message);
        setName("");
        setEmail("");
        setPassword("");
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
      <h3>Student Registration</h3>

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

      <button type="submit">Register</button>

      {message && (
        <p style={{ color: isError ? "#dc2626" : "#16a34a" }}>{message}</p>
      )}
    </form>
  );
}

export default RegisterForm;
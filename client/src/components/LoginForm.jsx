import { useState } from "react";
import axios from "axios";

function LoginForm({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    axios
      .post("/api/auth/login", { email, password })
      .then((res) => onLogin(res.data.user))
      .catch((err) => {
        setMessage(
          err.response?.data?.message || "Could not log in. Is the server running?"
        );
      });
  }

  return (
    <form className="register-form" onSubmit={handleSubmit}>
      <h3>Login</h3>

      <label>Email</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <label>Password</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button type="submit">Login</button>

      {message && <p style={{ color: "#dc2626" }}>{message}</p>}
    </form>
  );
}

export default LoginForm;
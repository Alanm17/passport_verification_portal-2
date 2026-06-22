import React, { useState } from "react";
import Routes from "./Routes";
import { checkServerHealth } from "./utils/api";

function App() {
  const [status, setStatus] = useState("idle");

  const wakeUpBackend = async () => {
    setStatus("waking");
    try {
      const res = await checkServerHealth();
      if (res) {
        setStatus("awake");
      } else {
        setStatus("error");
      }
    } catch (e) {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 3000);
  };

  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={wakeUpBackend}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all font-medium text-sm"
          disabled={status === "waking"}
        >
          {status === "idle" && "Wake Up Backend"}
          {status === "waking" && "Waking..."}
          {status === "awake" && "Backend Awake!"}
          {status === "error" && "Wake Failed"}
        </button>
      </div>
      <Routes />
    </>
  );
}

export default App;

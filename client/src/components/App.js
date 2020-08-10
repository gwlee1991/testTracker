import React from "react";
import { Route, Router } from "react-router-dom";
import history from "../history";

const App = () => {
  return (
    <Router history={history}>
      <div className="app">App Component</div>
    </Router>
  );
};

export default App;

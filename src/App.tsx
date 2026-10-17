import { Route, Switch, Link, Router as WouterRouter } from "wouter";
import OrderTracking from "./components/mockups/OrderTracking";

function getBasePath() { 
  return import.meta.env.BASE_URL.replace(/\/$/, ""); 
}
function getRouterBase() { 
  const b = getBasePath(); 
  return b || "/"; 
}

export default function App() {
  return (
    <WouterRouter base={getRouterBase()}>
      <Switch>
        {/* Homepage now shows tracking design directly */}
        <Route path="/" component={OrderTracking} />
        <Route path="/track/:id?"><OrderTracking /></Route>
        <Route path="/preview/:rest*"><OrderTracking /></Route>
        <Route>
          <div className="min-h-screen grid place-items-center bg-zinc-50">
            <div className="text-center">
              <h1 className="text-2xl font-bold">404</h1>
              <Link href="/" className="underline">Back to Tracking</Link>
            </div>
          </div>
        </Route>
      </Switch>
    </WouterRouter>
  );
}

import { Router as WouterRouter } from "wouter";
import TrustLinkPro from "./components/mockups/TrustLinkPro";
function getBasePath(){return import.meta.env.BASE_URL.replace(/\/$/,"")}
export default function App(){ return <WouterRouter base={getBasePath()||"/"}><TrustLinkPro /></WouterRouter> }

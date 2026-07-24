import type { Metadata } from "next";
import AuthForm from "../signup/AuthForm";

export const metadata: Metadata = {
  title: "Log In — DorDam",
  description: "Log in to your DorDam account.",
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}

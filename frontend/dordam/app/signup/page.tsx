import type { Metadata } from "next";
import AuthForm from "./AuthForm";

export const metadata: Metadata = {
  title: "Sign Up — DorDam",
  description: "Create a DorDam account.",
};

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}

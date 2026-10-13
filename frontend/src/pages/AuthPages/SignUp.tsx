import SignUpForm from "@/components/auth/SignUpForm";
import PageMeta from "@/components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="React.js SignUp Dashboard | Mira"
        description="This is React.js SignUp Tables Dashboard page for Mira"
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}

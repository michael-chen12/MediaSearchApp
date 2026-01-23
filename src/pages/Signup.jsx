import AuthForm from '../components/auth/AuthForm';

export default function Signup() {
  return (
    <div className="max-w-md mx-auto px-4 sm:px-0">
      <AuthForm mode="signup" />
    </div>
  );
}

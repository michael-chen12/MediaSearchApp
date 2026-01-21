import AuthForm from '../components/auth/AuthForm';

export default function Login() {
  return (
    <div className="max-w-md mx-auto">
      <AuthForm mode="login" />
    </div>
  );
}

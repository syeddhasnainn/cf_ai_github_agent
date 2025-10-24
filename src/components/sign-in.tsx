export const SigninWithGithub = () => {
  const handleSignIn = () => {
    // const prod = `https://github.com/login/oauth/authorize?client_id=Ov23liJIXUl7mgIUlWQB&redirect_uri=https://github-agent.syedhasnainmurtaza.workers.dev/api/auth&scope=repo`;
    const dev = `https://github.com/login/oauth/authorize?client_id=Ov23liJIXUl7mgIUlWQB&redirect_uri=http://localhost:5173/api/auth&scope=repo user:email`;
    window.location.href = dev;
  };

  return (
    <div className="p-4">
      <button
        onClick={handleSignIn}
        className="border border-white/20 p-2 rounded-md "
      >
        Sign in with Github
      </button>
    </div>
  );
};

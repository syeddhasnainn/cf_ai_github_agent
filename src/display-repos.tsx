import { useEffect, useState } from "react";

export const DisplayRepos = ({
  repos,
  setRepos,
  selectedRepo,
  setSelectedRepo
}: {
  repos: any;
  setRepos: (repos: any) => void;
  selectedRepo: any;
  setSelectedRepo: (repo: any) => void;
}) => {
  useEffect(() => {
    const fetchRepos = async () => {
      const repos = await fetch("/api/getRepos", {
        method: "POST",
        body: JSON.stringify({
          accessToken: localStorage.getItem("access_token")
        })
      });

      const data = await repos.json();
      setRepos(data.slice(0, 10));
    };
    fetchRepos();
  }, []);

  const handleRepoChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedRepo = repos.find(
      (repo) => repo.full_name === event.target.value
    );

    console.log("selectedRepo", selectedRepo);
    console.log("type of selectedRepo", typeof selectedRepo);

    setSelectedRepo(selectedRepo);
  };

  return (
    <div className="p-4">
      <div>
        <select
          className="border border-white/20 rounded-md p-2"
          name="repos"
          id="repos"
          onChange={handleRepoChange}
        >
          {repos.map((repo) => (
            <option key={repo.id} value={repo.full_name}>
              {repo.full_name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

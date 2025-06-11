// src/hooks/useGetSuggestedUsers.js

import { setSuggestedUsers } from "../redux/authSlice";
import axios from "axios";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

const useGetSuggestedUsers = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchSuggestedUsers = async () => {
      try {
        const res = await axios.get(
          "http://localhost:8080/api/v1/user/suggested",
          { withCredentials: true }
        );

        if (res.data.success) {
          dispatch(setSuggestedUsers(res.data.users));
        } else {
          console.warn("Suggested users fetch failed:", res.data.message);
        }
      } catch (error) {
        console.error("Error fetching suggested users:", error.message);
      }
    };

    fetchSuggestedUsers();
  }, [dispatch]);
};

export default useGetSuggestedUsers;

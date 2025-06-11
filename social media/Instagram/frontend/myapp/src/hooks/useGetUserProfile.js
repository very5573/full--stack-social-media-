import { setUserProfile } from "../redux/authSlice";
import axios from "axios";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

const useGetUserProfile = (userId) => {
    const dispatch = useDispatch();

    // ✅ yeh function pehle jaisa hi hai, but ab return bhi karenge
    const fetchUserProfile = async () => {
        try {
            const res = await axios.get(`http://localhost:8080/api/v1/user/${userId}/profile`, { withCredentials: true });
            if (res.data.success) { 
                dispatch(setUserProfile(res.data.user));
            }
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        fetchUserProfile(); // ✅ component mount/update pe profile fetch karega
    }, [userId]);

    return fetchUserProfile; // ✅ Follow/Unfollow ke baad call karne ke liye
};

export default useGetUserProfile;

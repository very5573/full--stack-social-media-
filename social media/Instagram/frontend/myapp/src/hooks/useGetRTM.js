import { setMessages } from "../redux/chatSlice";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

const useGetRTM = () => {
  const dispatch = useDispatch();
  const { socket } = useSelector((store) => store.socketio);
  const { messages } = useSelector((store) => store.chat);

  useEffect(() => {
    const handleNewMessage = (newMessage) => {
      // Using functional update to avoid stale state issues
      dispatch(setMessages([...messages, newMessage]));
    };

    if (socket) {
      socket.on("newMessage", handleNewMessage);
    }

    return () => {
      socket?.off("newMessage", handleNewMessage);
    };
  }, [socket, messages, dispatch]);
};

export default useGetRTM;

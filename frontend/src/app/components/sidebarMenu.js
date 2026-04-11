// sidebarMenu.js
import HomeIcon from "@mui/icons-material/Home";
import SearchIcon from "@mui/icons-material/Search";
import MovieIcon from "@mui/icons-material/Movie";
import SendIcon from "@mui/icons-material/Send";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import MenuIcon from "@mui/icons-material/Menu";

export const sidebarMenu = [
  { label: "Home", icon: HomeIcon, path: "/" },
  { label: "Search", icon: SearchIcon, path: "/search" },
  { label: "Reels", icon: MovieIcon, path: "/reels" },

  // custom component
  { label: "Create", type: "create" },

  { label: "Messages", icon: SendIcon, path: "/messages" },
  { label: "Notifications", icon: FavoriteBorderIcon, path: "/notifications" },
  { label: "Profile", icon: AccountCircleIcon, path: "/profile" },

  // dropdown
  { label: "More", icon: MenuIcon, type: "dropdown" },
];
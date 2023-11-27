import React, { useState } from "react";
import {
  Grid,
  Paper,
  Avatar,
  TextField,
  Button,
  Typography,
  Toolbar,
  IconButton,
} from "@material-ui/core";
import LockIcon from "@mui/icons-material/Lock";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Checkbox from "@material-ui/core/Checkbox";
import { Link, useNavigate } from "react-router-dom";
import ArrowLeftIcon from "@mui/icons-material/ArrowLeft";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import GoogleIcon from "@mui/icons-material/Google";
import FacebookIcon from "@mui/icons-material/Facebook";
import { loginUser } from "../../services/userServices";

const SignIn = ({ handleChange }) => {
  // LAYOUT
  const paperStyle = {
    padding: "0 50px 50px 50px",
    height: "600px",
    width: "640px",
    margin: "0 auto",
  };

  const signInButton = {
    color: "#10375C",
    borderBottom: "2px solid #10375C",
    fontWeight: "bold",
    borderRadius: 0,
    paddingLeft: "16px",
    paddingRight: "16px",
  };

  const bg = {
    backgroundImage:
      "url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
  };

  const avatarStyle = { backgroundColor: "#10375C" };
  const btnstyle = { margin: "8px 0", backgroundColor: "#10375C" };

  // EVENT
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prevCredentials) => ({
      ...prevCredentials,
      [name]: value,
    }));
  };

  const handleLogin = async () => {
    const { username, password } = credentials;

    if (!username || !password) {
      toast.error("Please enter both username and password");
      return;
    }

    try {
      const response = await loginUser(username, password);

      if (response.status === 200) {
        if (response.data.userData.isVerified) {
          localStorage.setItem("account", JSON.stringify(response.data));
          toast.success("Login successful");
        } else toast.error("This email has not been verified");
        setTimeout(() => {
          navigate(`/home/${response.data.userData._id}`);
        }, 1000);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Username or password incorrect");
      } else {
        console.error("Error sending login request", error);
        toast.error(error.message);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.charCode === 13 && e.code === "Enter") {
      handleLogin();
    }
  };

  return (
    <Grid
      className="font-sans pt-12 h-screen bg-gradient-to-br from-[#10375C] via-blue-700 to-blue-800"
      style={bg}
    >
      <Paper style={paperStyle}>
        <IconButton
          color="inherit"
          component={Link}
          to="/"
          className="absolute top-0 left-[-45px]"
        >
          <ArrowLeftIcon />
        </IconButton>
        <Toolbar className="flex justify-around items-center ">
          <Button
            color="inherit"
            component={Link}
            to="/signin"
            style={signInButton}
          >
            Sign In
          </Button>
          <Button color="inherit" component={Link} to="/signup">
            Sign Up
          </Button>
        </Toolbar>

        <Grid align="center" className="mt-2">
          <Avatar style={avatarStyle}>
            <LockIcon />
          </Avatar>
          <h2>Sign In</h2>
        </Grid>
        <form>
          <TextField
            label="Username"
            placeholder="Enter username"
            variant="standard"
            fullWidth
            required
            name="username"
            value={credentials.username}
            onChange={handleInputChange}
          />
          <TextField
            label="Password"
            placeholder="Enter password"
            type="password"
            variant="standard"
            fullWidth
            required
            name="password"
            value={credentials.password}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
          />
          <FormControlLabel
            control={<Checkbox name="checkedB" color="primary" />}
            label="Remember me"
          />
          <Button
            type="button"
            color="primary"
            variant="contained"
            style={btnstyle}
            fullWidth
            onClick={handleLogin}
          >
            Sign in
          </Button>
          <Grid container spacing={1} className="text-center mt-2 pb-[10px]">
            <Grid item xs={6}>
              <Button
                color="inherit"
                variant="text"
                style={{ backgroundColor: "#F5F5F5" }}
                fullWidth
              >
                <GoogleIcon style={{ fontSize: "28px", color: "#F44336" }} />
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                color="inherit"
                variant="text"
                style={{ backgroundColor: "#F5F5F5" }}
                fullWidth
              >
                <FacebookIcon style={{ fontSize: "28px", color: "#3B5998" }} />
              </Button>
            </Grid>
          </Grid>
        </form>
        <Typography>
          <Link to="/forgot-password" className="text-[#3B5998]">
            Forgot password?
          </Link>
        </Typography>
        <Typography>
          Do you have an account?{" "}
          <Link to="/signup" className="text-[#3B5998]">
            Sign Up
          </Link>
        </Typography>
      </Paper>
      <ToastContainer
        position="bottom-right"
        autoClose={1500}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </Grid>
  );
};

export default SignIn;

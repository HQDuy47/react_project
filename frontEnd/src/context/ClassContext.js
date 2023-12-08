import React, { createContext, useState, useContext, useEffect } from "react";
import { getAllClasses } from "../services/classServices";
import { useNavigate } from "react-router-dom";

const ClassContext = createContext();

export const useClassContext = () => useContext(ClassContext);

export const ClassProvider = ({ children }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await getAllClasses(token);
        const classesData = response.data.classes;

        // Assuming you want to map all classesData items
        const mappedClasses = classesData.map((data) => ({
          id: data._id || "",
          title: data.title || "",
          teacher: data.teacher || "",
          className: data.className || "",
        }));

        setClasses(mappedClasses);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching classes:", error);
        navigate("/500");
      }
    };

    fetchUserData();
  }, [navigate, token, classes]);

  //  const addClass = (newClass) => {
  //     setClasses((prevClasses) => [...prevClasses, newClass]);
  //   };

  // const createClass = async (e) => {
  //   e.preventDefault();
  //   const { title, className, teacher } = classes;

  //   try {
  //     const response = await createClass(title, teacher, className, token);
  //   } catch (error) {
  //     console.error("Error fetching create class:", error);
  //     navigate("/500");
  //   }
  // };

  return (
    <ClassContext.Provider value={{ classes, loading }}>
      {children}
    </ClassContext.Provider>
  );
};

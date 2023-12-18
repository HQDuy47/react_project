import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getClassByID } from "../../services/classServices";
import ClipboardJS from "clipboard";
import { jwtDecode } from "jwt-decode";

function ClassId(props) {
  const { id } = useParams();
  const token = localStorage.getItem("token");
  const textRef = useRef(null);
  const navigate = useNavigate();
  const [detailClass, setDetailClass] = useState({});
  const [isClassOwner, setIsClassOwner] = useState(false);
  let dataUser;
  if (token) dataUser = jwtDecode(token);
  // APIgetClass
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await getClassByID(id, token);
        const data = response.data.classInfo;

        setDetailClass({
          id: data._id || "",
        });

        if (data.teachers[0]._id === dataUser._id) {
          setIsClassOwner(true);
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
        navigate("/500");
      }
    };

    fetchUserData();
  }, [navigate, token, id]);

  // Coppy ID
  const handleCopyClick = () => {
    const clipboard = new ClipboardJS(".copy-button", {
      text: () => textRef.current.innerText,
    });

    clipboard.on("success", () => {
      clipboard.destroy();
      window.alert("Text copied to clipboard!");
    });

    clipboard.on("error", (e) => {
      clipboard.destroy();
    });
  };

  return (
    <div>
      {isClassOwner ? (
        <section className="border p-4 rounded-lg flex flex-col">
          <h2 className="font-semibold">Class ID</h2>

          <p
            ref={textRef}
            className="mt-3 text-gray-400 overflow-hidden overflow-ellipsis whitespace-nowrap max-w-[200px]"
          >
            {detailClass.id}
          </p>
          <button
            onClick={handleCopyClick}
            className="ml-auto text-blue-400 cursor-pointer copy-button"
          >
            Copy
          </button>
        </section>
      ) : (
        <></>
      )}
    </div>
  );
}

export default ClassId;
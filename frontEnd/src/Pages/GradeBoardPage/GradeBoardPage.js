import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getAllGradeClass,
  editClassGrade,
  addGradeToClass,
} from "../../services/gradeServices";
import { useClassDetailContext } from "../../context/ClassDetailContext";
import { addGradeReviewByID } from "../../services/gradeReviewServices";
import { toast } from "react-toastify";
import Modal from "../../components/Modal/ClassDetailModal";
import Papa from "papaparse";
import { getClassByID } from "../../services/classServices";
import SearchIcon from "@mui/icons-material/Search";
// import { format } from "date-fns";
import { jwtDecode } from "jwt-decode";

const YourComponent = () => {
  const token = localStorage.getItem("token");
  const { id } = useParams();
  const [grades, setGrades] = useState([]);

  const [allTopics, setAllTopics] = useState([]);
  const [allRatios, setAllRatios] = useState([]);
  // console.log(allTopics);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [inputValues, setInputValues] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });

  const { isClassOwner } = useClassDetailContext();
  const [isModalOpen1, setIsModalOpen1] = useState(false);

  const [isDragging, setIsDragging] = useState(false);

  let data;
  if (token) data = jwtDecode(token);

  // const dataUser = localStorage.getItem("user");
  // const user = JSON.parse(dataUser);
  // const avtPath = `/assets/imgs/${user.img}`;

  const [reviewData, setReviewData] = useState({
    avt: "",
    fullname: "",
    userID: "",
    date: "",
    typeGrade: "",
    currentGrade: "",
    expectationGrade: "",
    explaination: "",
  });

  const handleReviewSubmit = async (e) => {
    e.preventDefault();

    try {
      const currentDate = new Date();
      // const formattedDate = format(currentDate, "dd MMMM yyyy");
      // Gọi hàm API
      const response = await addGradeReviewByID(
        id,
        token,
        reviewData.avt,
        data.fullname,
        data.userID,
        currentDate,
        reviewData.typeGrade,
        reviewData.currentGrade,
        reviewData.expectationGrade,
        reviewData.explaination
      );
      closeModal();
      toast.success("Review added successfully!");
      console.log(response.data); // In ra kết quả từ server
    } catch (error) {
      console.error("Error adding grade review:", error);
    }
  };

  // Updated handleReviewDataChange function
  const handleReviewDataChange = (e, field) => {
    const { value } = e.target;
    setReviewData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
  };

  // Export CSV
  const handleExportCSV = () => {
    const csvData = [["Student ID", "Full Name", ...allTopics, "Total"]];
    grades.forEach((student) => {
      const row = [
        student.studentId,
        student.fullName,
        ...allTopics.map((topic) =>
          getScoreByTopic(student.grades, topic).toString()
        ),
        calculateWeightedTotal(student.grades).toString(),
      ];
      csvData.push(row);
    });

    const csv = Papa.unparse(csvData);

    const blob = new Blob([String.fromCharCode(0xfeff), csv], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "grades.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Import CSV
  const handleDragEnter = () => {
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];

    if (file) {
      handleFile(file);
      setIsDragging(false);
    }
  };

  // const handleDragOver = (event) => {
  //   event.preventDefault();
  // };

  const handleFile = (file) => {
    if (file.type !== "text/csv") {
      toast.error("Unsupported file type. Please select a CSV file.");
      return;
    }

    Papa.parse(file, {
      complete: (result) => {
        const importedData = result.data;

        if (!isValidCSVStructure(importedData)) {
          toast.error(
            "Invalid CSV file structure. Please check the file format."
          );
        } else {
          updateStateWithImportedData(importedData);
          toast.success("CSV file imported successfully");
        }
      },
      header: true,
    });
  };

  const handleFileChange = (event) => {
    const fileInput = event.target;
    const file = fileInput.files[0];

    if (file) {
      if (file.type !== "text/csv") {
        // Display an error toast for unsupported file types
        toast.error("Unsupported file type. Please select a CSV file.");
        resetFileInput(fileInput);
        return;
      }

      Papa.parse(file, {
        complete: (result) => {
          // Assuming your CSV has a specific format
          // Update your state or perform other actions based on the parsed data
          const importedData = result.data;

          if (!isValidCSVStructure(importedData)) {
            // Display an error toast for invalid CSV structure
            toast.error(
              "Invalid CSV file structure. Please check the file format."
            );
          } else {
            // Check if all scores are within the range of 0 to 10
            const invalidScores = importedData.some((row) => {
              const scores = allTopics.map(
                (topic) => parseFloat(row[topic]) || 0
              );
              return scores.some((score) => score < 0 || score > 10);
            });

            if (invalidScores) {
              // Display an error toast for invalid scores
              toast.error(
                "Invalid scores. Please enter values between 0 and 10."
              );
              resetFileInput(fileInput);
              return;
            }

            // Check for duplicate Student IDs in the imported data
            const duplicateStudentIds = findDuplicateStudentIds(importedData);

            if (duplicateStudentIds.length > 0) {
              // Display an error toast for duplicate Student IDs
              toast.error(
                `Duplicate Student IDs found in the imported data: ${duplicateStudentIds.join(
                  ", "
                )}`
              );
              resetFileInput(fileInput);
              return;
            }

            // Example: Update state with the imported data
            updateStateWithImportedData(importedData);

            toast.success("CSV file imported successfully");
          }

          resetFileInput(fileInput);
        },
        header: true, // If your CSV has headers
      });
    }
  };

  const findDuplicateStudentIds = (importedData) => {
    const studentIdSet = new Set();
    const duplicateStudentIds = [];

    for (const row of importedData) {
      const studentId = row["Student ID"];

      if (studentIdSet.has(studentId)) {
        duplicateStudentIds.push(studentId);
      } else {
        studentIdSet.add(studentId);
      }
    }

    return duplicateStudentIds;
  };

  const resetFileInput = (fileInput) => {
    fileInput.value = "";
  };

  const isValidCSVStructure = (importedData) => {
    // Customize this function based on the expected structure of your CSV file
    // For example, check if the required columns exist
    // You may need to modify this logic based on your specific use case
    const requiredColumns = ["Student ID", "Full Name", ...allTopics, "Total"];

    return (
      Array.isArray(importedData) &&
      importedData.length > 0 &&
      requiredColumns.every((column) => importedData[0].hasOwnProperty(column))
    );
  };

  const updateStateWithImportedData = async (importedData) => {
    // Update your state or perform other actions with the imported data

    // Example: Assuming your CSV data has a structure similar to your existing data
    const updatedGrades = await Promise.all(
      importedData.map(async (row) => {
        const studentId = row["Student ID"];
        const fullName = row["Full Name"];
        const scores = allTopics.map((topic) => parseFloat(row[topic]) || 0);
        try {
          await addGradeToClass(id, studentId, fullName, scores, token);
        } catch (error) {
          toast.error(error.response.data.message);
        }
        return {
          studentId,
          fullName,
          grades: allTopics.map((topic, index) => ({
            topic,
            score: scores[index],
          })),
        };
      })
    );

    // Example: Update state with the imported data
    setGrades(updatedGrades);
  };

  // Modal
  const openModal = (student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedStudent(null);
    setIsModalOpen(false);
  };

  // Modal
  const openModal1 = () => {
    setIsModalOpen1(true);
  };

  const closeModal1 = () => {
    setIsModalOpen1(false);
  };

  // API getGrade
  // Assuming you have a state variable to store the list of ratios
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getAllGradeClass(id, token);
        const data = response.data.grades;
        setGrades(data);

        const response1 = await getClassByID(id, token);
        const classInfo = response1.data.classInfo;

        // Check if gradestructs is defined before extracting data
        if (classInfo.gradestructs && classInfo.gradestructs.length > 0) {
          // Lấy danh sách chủ đề từ dữ liệu đầu vào
          const topics = classInfo.gradestructs.map((grade) => grade.topic);

          // Lấy danh sách ratio từ dữ liệu đầu vào
          const ratios = classInfo.gradestructs.map((grade) => grade.ratio);

          setAllTopics(topics);
          setAllRatios(ratios);
        } else {
          console.error("gradestructs is undefined or empty");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [id, token]); // Include id and token as dependencies

  // API Edit Grade
  const handleSave = async () => {
    try {
      const updatedGrade = {
        studentID: selectedStudent.studentId,
        newScore: allTopics.map((topic) => {
          const inputValue = document.getElementById(`current-${topic}`).value;
          return parseFloat(inputValue) || 0;
        }),
      };

      // Call the editClassGrade API
      await editClassGrade(id, token, updatedGrade);

      toast.success("Grade edited successfully:");

      // Update the grades array in state
      setGrades((prevGrades) => {
        const updatedGrades = prevGrades.map((student) => {
          if (student.studentId === selectedStudent.studentId) {
            // Update the grades for the selected student
            const updatedGrades = student.grades.map((grade) => {
              const topic = grade.topic;
              const inputValue = document.getElementById(
                `current-${topic}`
              ).value;
              const updatedScore = parseFloat(inputValue) || 0;
              return {
                ...grade,
                score: isNaN(updatedScore) ? 0 : updatedScore,
              };
            });
            return {
              ...student,
              grades: updatedGrades,
            };
          }
          return student;
        });
        return updatedGrades;
      });

      closeModal();
    } catch (error) {
      toast.error("Error editing grade:", error);
      console.error("Error while saving:", error);
    }
  };

  const handleInputChange = (topic, value) => {
    setInputValues({
      ...inputValues,
      [topic]: value,
    });
  };

  // TOTAL
  const calculateWeightedTotal = (grades) => {
    const unroundedTotal = grades.reduce((total, grade) => {
      const ratio = allRatios[allTopics.indexOf(grade.topic)] || 0;
      return total + (grade.score * ratio) / 100;
    }, 0);

    // Sử dụng toFixed(2) để làm tròn đến 2 chữ số thập phân
    const roundedTotal = parseFloat(unroundedTotal.toFixed(2));

    return roundedTotal;
  };

  // SORT
  const sortData = (data, key, direction) => {
    const sortedData = [...data];
    sortedData.sort((a, b) => {
      if (key === "total") {
        const totalA = calculateWeightedTotal(a.grades);
        const totalB = calculateWeightedTotal(b.grades);

        if (totalA < totalB) {
          return direction === "ascending" ? -1 : 1;
        }
        if (totalA > totalB) {
          return direction === "ascending" ? 1 : -1;
        }
        return 0;
      } else {
        // For other columns, use the existing logic
        if (a[key] < b[key]) {
          return direction === "ascending" ? -1 : 1;
        }
        if (a[key] > b[key]) {
          return direction === "ascending" ? 1 : -1;
        }
        return 0;
      }
    });
    return sortedData;
  };

  const handleSort = (key) => {
    if (key === "total") {
      const direction =
        sortConfig.key === key && sortConfig.direction === "ascending"
          ? "descending"
          : "ascending";

      setSortConfig({ key, direction });
    } else {
      // For other columns, use the existing logic
      const direction =
        sortConfig.key === key && sortConfig.direction === "ascending"
          ? "descending"
          : "ascending";

      setSortConfig({ key, direction });
    }
  };

  const renderSortArrow = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === "ascending" ? " ▲" : " ▼";
    }
    return null;
  };

  useEffect(() => {
    // Set default value for typeGrade if it's falsy
    if (!reviewData.typeGrade && allTopics.length > 0) {
      setReviewData((prevData) => ({
        ...prevData,
        typeGrade: allTopics[0],
      }));
    }
  }, [allTopics]);

  return (
    <div className="mt-10">
      <h2 className="mt-10 text-2xl text-[#10375c] font-bold mb-4">
        Grade Board
      </h2>
      {/* SEARCH */}
      <div className="relative mt-2 flex items-center mb-4">
        <input
          type="text"
          placeholder="Search by Full Name or Student ID"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2 pl-4 border border-gray-300 rounded-md w-1/3 text-sm focus:outline-none focus:ring focus:border-blue-300"
        />
        <div className="absolute inset-y-0 left-0 flex items-center ml-[330px]">
          <SearchIcon />
        </div>
      </div>
      {/* IMPORT / EXPORT */}
      {isClassOwner && (
        <div className="flex justify-end">
          <label
            htmlFor="test"
            className={`flex justify-end text-[#2E80CE] text-xs bg-white border border-[#2E80CE] focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-full px-3 ${
              isDragging
                ? "fixed top-0 left-0 w-full h-full bg-black bg-opacity-60 z-10"
                : ""
            } mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700 cursor-pointer`}
          >
            <div
              className="w-full h-full flex  items-center justify-center"
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(e);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
            >
              <svg
                class="w-3 h-3 me-1"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 18 16"
              >
                <path
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M1 8h11m0 0L8 4m4 4-4 4m4-11h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3"
                />
              </svg>
              Import
            </div>
          </label>
          <input
            id="test"
            type="file"
            hidden
            onChange={(event) => handleFileChange(event)}
          />

          <button
            type="button"
            onClick={handleExportCSV}
            className=" ml-1 flex justify-end text-[#2E80CE] text-xs bg-white border border-[#2E80CE] focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-full  px-3 py-1.5 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700"
          >
            <svg
              class="w-3 h-3 me-1"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M14.707 7.793a1 1 0 0 0-1.414 0L11 10.086V1.5a1 1 0 0 0-2 0v8.586L6.707 7.793a1 1 0 1 0-1.414 1.414l4 4a1 1 0 0 0 1.416 0l4-4a1 1 0 0 0-.002-1.414Z" />
              <path d="M18 12h-2.55l-2.975 2.975a3.5 3.5 0 0 1-4.95 0L4.55 12H2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2Zm-3 5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
            </svg>
            Export
          </button>
        </div>
      )}
      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300 mb-6">
          {/* HEADER */}
          <thead>
            <tr>
              <th
                className="py-2 px-4 border-b cursor-pointer"
                onClick={() => handleSort("studentId")}
              >
                Student ID
                {renderSortArrow("studentId")}
              </th>
              <th
                className="py-2 px-4 border-b cursor-pointer"
                onClick={() => handleSort("fullName")}
              >
                Full Name
                {renderSortArrow("fullName")}
              </th>
              {allTopics.map((topic, index) => (
                <th key={topic} className="py-2 px-4 border-b cursor-pointer">
                  {`${topic}  ${allRatios[index]}%`}
                </th>
              ))}
              <th
                className="py-2 px-4 border-b cursor-pointer"
                onClick={() => handleSort("total")}
              >
                Total
                {renderSortArrow("total")}
              </th>
              <th className="py-2 px-4 border-b">Action</th>
            </tr>
          </thead>

          {/* CONTENT */}
          <tbody>
            {sortData(grades, sortConfig.key, sortConfig.direction)
              .filter(
                (student) =>
                  (student.fullName &&
                    student.fullName
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase())) ||
                  (student.studentId &&
                    student.studentId
                      .toString()
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase()))
              )
              .map((student) => (
                <tr key={student._id} className="text-center">
                  <td className="py-2 px-4 border-b">{student.studentId}</td>
                  <td className="py-2 px-4 border-b">{student.fullName}</td>
                  {allTopics.map((topic) => (
                    <td key={topic} className="py-2 px-4 border-b">
                      {getScoreByTopic(student.grades, topic)}
                    </td>
                  ))}
                  <td className="py-2 px-4 border-b">
                    {calculateWeightedTotal(student.grades)}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {isClassOwner ? (
                      <button
                        className="bg-blue-500 text-white py-1 px-2 font-semibold font-sans rounded "
                        onClick={() => openModal(student)}
                      >
                        Edit
                      </button>
                    ) : (
                      <>
                        <button
                          className="bg-blue-500 text-white py-1 px-2 font-semibold font-sans rounded"
                          onClick={openModal1}
                        >
                          Feed Back
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {/* Submit */}
        {isClassOwner && (
          <div className="text-center">
            <button
              type="button"
              className="bg-blue-500 text-white mt-3  border-blue-400  hover:bg-blue-400  font-semibold font-sans rounded-full text-sm px-5 py-2.5  mb-2 "
            >
              Submit
            </button>
          </div>
        )}

        {/* Modal Edit */}
        <Modal show={isModalOpen} handleClose={closeModal}>
          <h2 className="text-2xl font-semibold mb-4">Grades</h2>
          <form>
            {selectedStudent &&
              allTopics.map((topic) => (
                <div key={topic} className="mb-4">
                  <label className="block text-sm font-medium text-gray-600">
                    {topic}
                  </label>
                  <input
                    id={`current-${topic}`}
                    type="number"
                    value={
                      inputValues[topic] ||
                      getScoreByTopic(selectedStudent.grades, topic)
                    }
                    onChange={(e) => handleInputChange(topic, e.target.value)}
                    min="0"
                    max="10"
                    className="mt-1 p-2 border border-gray-300 rounded-md w-full"
                  />
                </div>
              ))}
          </form>

          <div className="flex justify-end">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded-md mr-2"
              onClick={() => handleSave(inputValues)}
            >
              Save
            </button>
            <button
              className="border border-gray-300 px-4 py-2 rounded-md"
              onClick={closeModal}
            >
              Cancel
            </button>
          </div>
        </Modal>

        {/* Modal FeedBack */}
        <Modal show={isModalOpen1} handleClose={closeModal1}>
          <h2 className="text-2xl font-semibold mb-4">Feed Back</h2>
          <form>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600">
                Type grade:
              </label>
              <input type="hidden" name="hidden" />
              <select
                name="typeGrade"
                id="grade"
                value={reviewData.typeGrade}
                onChange={(e) => handleReviewDataChange(e, "typeGrade")}
                className="mt-1 p-3 border border-gray-300 rounded-md w-full"
              >
                {allTopics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600">
                Current grade:
              </label>
              <input
                id="current-currentGrade"
                type="number"
                value={reviewData.currentGrade}
                onChange={(e) => handleReviewDataChange(e, "currentGrade")}
                min="0"
                max="10"
                className="mt-1 p-2 border border-gray-300 rounded-md w-full"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600">
                Expectation grade:
              </label>
              <input
                id="expectationGrade"
                type="number"
                value={reviewData.expectationGrade}
                onChange={(e) => handleReviewDataChange(e, "expectationGrade")}
                min="0"
                max="10"
                className="mt-1 p-2 border border-gray-300 rounded-md w-full"
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-600">
                Explanation:
              </label>
              <textarea
                id="explaination" // Thay đổi id thành "description"
                type="text"
                placeholder="Write your explanation here..."
                value={reviewData.explaination}
                onChange={(e) => handleReviewDataChange(e, "explaination")}
                className="mt-1 p-2 border border-gray-300 rounded-md w-full focus:outline-none"
              />
            </div>
          </form>

          <div className="flex justify-end">
            <button
              onClick={handleReviewSubmit}
              // onClick={handleEditClass}
              className="bg-blue-500 text-white px-4 py-2 rounded-md mr-2"
            >
              Send
            </button>
            <button
              onClick={closeModal1}
              className="border border-gray-300 px-4 py-2 rounded-md"
            >
              Cancel
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
};

const getScoreByTopic = (grades, topic) => {
  const grade = grades.find((g) => g.topic === topic);
  return grade ? grade.score : 0;
};

export default YourComponent;

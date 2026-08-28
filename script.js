// ======================================================
// FIREBASE
// ======================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


// ======================================================
// FIREBASE CONFIGURATION
// ======================================================

const firebaseConfig = {
  apiKey: "AIzaSyCKsh43O6DYwfPheHH9CsraX3VpU2fjc",
  authDomain: "langdex.firebaseapp.com",
  projectId: "langdex",
  storageBucket: "langdex.firebasestorage.app",
  messagingSenderId: "819838317933",
  appId: "1:819838317933:web:cae7f4531ea32f958c5664",
  measurementId: "G-F60CC2CDC"
};


// ======================================================
// INITIALIZE FIREBASE
// ======================================================

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);


// ======================================================
// FORM
// ======================================================

const form = document.querySelector(".form");

let idInput = null;
let wordInput = null;
let meaningInput = null;
let synonymsInput = null;
let languageSelect = null;


// ======================================================
// GET FORM INPUTS
// ======================================================

if (form) {

  const inputs = form.querySelectorAll("input");

  idInput = inputs[0] || null;
  wordInput = inputs[1] || null;
  meaningInput = inputs[2] || null;
  synonymsInput = inputs[3] || null;

  languageSelect =
    form.querySelector("select");

}


// ======================================================
// BUTTONS
// ======================================================

const registerButton =
  document.querySelector(".reg");

const updateButton =
  document.querySelector(".upa");

const deleteButton =
  document.querySelector(".del");

const clearButton =
  document.querySelector(".cel");

const generateButton =
  document.querySelector(".gen");


// ======================================================
// SEARCH
// ======================================================

const searchInput =
  document.querySelector(".search-txt") ||
  document.querySelector(".search-section input");

const searchButton =
  document.querySelector(".search-btn");


// ======================================================
// SHOW DATA
// ======================================================

const showDataButton =
  document.querySelector(".show-data");

const dataTable =
  document.querySelector("#data-table");


// ======================================================
// VARIABLES
// ======================================================

// Firestore document ID
let selectedDocumentId = null;


// True when the form contains existing database data
let isExistingData = false;


// All search results
let searchResults = [];


// Current search position
let searchIndex = 0;


// Last search text
let lastSearchText = "";


// ======================================================
// UPDATE GENERATE BUTTON
// ======================================================

function updateGenerateButton() {

  if (!generateButton) {
    return;
  }


  if (isExistingData) {

    generateButton.disabled = true;

    generateButton.style.opacity = "0.5";

    generateButton.style.cursor = "not-allowed";

  } else {

    generateButton.disabled = false;

    generateButton.style.opacity = "1";

    generateButton.style.cursor = "pointer";

  }

}


// ======================================================
// GET NEXT ID
// ======================================================

async function setNextId() {

  if (!idInput) {
    return;
  }


  try {

    const snapshot =
      await getDocs(
        collection(db, "words")
      );


    let lastId = 0;


    snapshot.forEach((firebaseDoc) => {

      const data =
        firebaseDoc.data();


      const currentId =
        Number(data.id);


      if (
        !isNaN(currentId) &&
        currentId > lastId
      ) {

        lastId =
          currentId;

      }

    });


    idInput.value =
      lastId + 1;


  } catch (error) {

    console.error(
      "Error getting next ID:",
      error
    );


    alert(
      "Error getting next ID: " +
      error.message
    );

  }

}


// ======================================================
// CLEAR FORM
// ======================================================

async function clearForm() {

  // Clear Word
  if (wordInput) {
    wordInput.value = "";
  }


  // Clear Meaning
  if (meaningInput) {
    meaningInput.value = "";
  }


  // Clear Synonyms
  if (synonymsInput) {
    synonymsInput.value = "";
  }


  // Reset Language
  if (languageSelect) {
    languageSelect.selectedIndex = 0;
  }


  // Remove selected Firestore document
  selectedDocumentId = null;


  // Form is now ready for new data
  isExistingData = false;


  // Reset search
  searchResults = [];

  searchIndex = 0;

  lastSearchText = "";


  // Clear search input
  if (searchInput) {
    searchInput.value = "";
  }


  // Enable Generate
  updateGenerateButton();


  // Get last ID + 1
  await setNextId();

}


// ======================================================
// INITIALIZE ID
// ======================================================

if (idInput) {
  setNextId();
}


// ======================================================
// INITIAL GENERATE STATE
// ======================================================

updateGenerateButton();


// ======================================================
// CLEAR BUTTON
// ======================================================

if (clearButton) {

  clearButton.addEventListener(
    "click",
    async () => {

      await clearForm();

    }
  );

}


// ======================================================
// REGISTER / GENERATE
// ======================================================

if (registerButton) {

  registerButton.addEventListener(
    "click",
    async () => {

      // ------------------------------------------------
      // DON'T ALLOW REGISTERING SEARCH RESULT
      // ------------------------------------------------

      if (isExistingData) {

        alert(
          "This word already exists.\n\nUse UPDATE or DELETE."
        );

        return;
      }


      // ------------------------------------------------
      // CHECK FORM
      // ------------------------------------------------

      if (!wordInput || !meaningInput) {

        alert(
          "Form elements were not found."
        );

        return;
      }


      // ------------------------------------------------
      // GET VALUES
      // ------------------------------------------------

      const word =
        wordInput.value.trim();


      const meaning =
        meaningInput.value.trim();


      const synonyms =
        synonymsInput
          ? synonymsInput.value.trim()
          : "";


      const language =
        languageSelect
          ? languageSelect.value
          : "";


      // ------------------------------------------------
      // REQUIRED FIELDS
      // ------------------------------------------------

      if (!word || !meaning) {

        alert(
          "Please fill in WORD and MEANING."
        );

        return;
      }


      try {

        // ----------------------------------------------
        // GET DATABASE
        // ----------------------------------------------

        const snapshot =
          await getDocs(
            collection(db, "words")
          );


        // ----------------------------------------------
        // CHECK DUPLICATE
        // ----------------------------------------------

        let existingWord = null;


        snapshot.forEach((firebaseDoc) => {

          const data =
            firebaseDoc.data();


          const databaseWord =
            String(
              data.word ?? ""
            )
            .trim()
            .toLowerCase();


          if (
            databaseWord ===
            word.toLowerCase()
          ) {

            existingWord =
              data;

          }

        });


        // ----------------------------------------------
        // DUPLICATE FOUND
        // ----------------------------------------------

        if (existingWord) {

          alert(
            `This word already exists with ID ${existingWord.id}.`
          );

          return;
        }


        // ----------------------------------------------
        // FIND LAST ID
        // ----------------------------------------------

        let lastId = 0;


        snapshot.forEach((firebaseDoc) => {

          const data =
            firebaseDoc.data();


          const currentId =
            Number(data.id);


          if (
            !isNaN(currentId) &&
            currentId > lastId
          ) {

            lastId =
              currentId;

          }

        });


        const newId =
          lastId + 1;


        // ----------------------------------------------
        // ADD DATA
        // ----------------------------------------------

        await addDoc(
          collection(db, "words"),
          {

            id: newId,

            word: word,

            meaning: meaning,

            synonyms: synonyms,

            language: language

          }
        );


        // ----------------------------------------------
        // SUCCESS
        // ----------------------------------------------

        alert(
          "Data registered successfully!"
        );


        // ----------------------------------------------
        // PREPARE NEXT ID
        // ----------------------------------------------

        if (idInput) {
          idInput.value =
            newId + 1;
        }


        // Clear fields

        wordInput.value = "";

        meaningInput.value = "";

        if (synonymsInput) {
          synonymsInput.value = "";
        }

        if (languageSelect) {
          languageSelect.selectedIndex = 0;
        }


        selectedDocumentId = null;

        isExistingData = false;

        updateGenerateButton();


      } catch (error) {

        console.error(
          "Error saving data:",
          error
        );


        alert(
          "Error saving data: " +
          error.message
        );

      }

    }
  );

}


// ======================================================
// SEARCH
// ======================================================

if (
  searchInput &&
  searchButton
) {

  // Focus Search
  searchInput.focus();


  searchButton.addEventListener(
    "click",
    async () => {

      const searchText =
        searchInput.value
          .trim()
          .toLowerCase();


      // ------------------------------------------------
      // EMPTY SEARCH
      // ------------------------------------------------

      if (!searchText) {

        alert(
          "Please enter something to search."
        );

        return;
      }


      try {

        // ------------------------------------------------
        // NEW SEARCH
        // ------------------------------------------------

        if (
          searchText !==
          lastSearchText
        ) {

          const snapshot =
            await getDocs(
              collection(db, "words")
            );


          searchResults = [];


          // ----------------------------------------------
          // SEARCH ALL FIELDS
          // ----------------------------------------------

          snapshot.forEach((firebaseDoc) => {

            const data =
              firebaseDoc.data();


            const id =
              String(
                data.id ?? ""
              ).toLowerCase();


            const word =
              String(
                data.word ?? ""
              ).toLowerCase();


            const meaning =
              String(
                data.meaning ?? ""
              ).toLowerCase();


            const synonyms =
              String(
                data.synonyms ?? ""
              ).toLowerCase();


            const language =
              String(
                data.language ?? ""
              ).toLowerCase();


            if (

              id.includes(searchText) ||

              word.includes(searchText) ||

              meaning.includes(searchText) ||

              synonyms.includes(searchText) ||

              language.includes(searchText)

            ) {

              searchResults.push({

                data:
                  data,

                documentId:
                  firebaseDoc.id

              });

            }

          });


          // Start from first result

          searchIndex = 0;


          lastSearchText =
            searchText;

        }


        // ------------------------------------------------
        // NO RESULTS
        // ------------------------------------------------

        if (
          searchResults.length === 0
        ) {

          alert(
            "No results found."
          );

          return;
        }


        // ------------------------------------------------
        // GET CURRENT RESULT
        // ------------------------------------------------

        const result =
          searchResults[
            searchIndex
          ];


        const foundData =
          result.data;


        // ------------------------------------------------
        // SAVE FIRESTORE DOCUMENT ID
        // ------------------------------------------------

        selectedDocumentId =
          result.documentId;


        // ------------------------------------------------
        // THIS IS EXISTING DATA
        // ------------------------------------------------

        isExistingData =
          true;


        updateGenerateButton();


        // ------------------------------------------------
        // PUT DATA INTO FORM
        // ------------------------------------------------

        if (idInput) {

          idInput.value =
            foundData.id ?? "";

        }


        if (wordInput) {

          wordInput.value =
            foundData.word ?? "";

        }


        if (meaningInput) {

          meaningInput.value =
            foundData.meaning ?? "";

        }


        if (synonymsInput) {

          synonymsInput.value =
            foundData.synonyms ?? "";

        }


        if (languageSelect) {

          languageSelect.value =
            foundData.language ?? "";

        }


        // ------------------------------------------------
        // MOVE TO NEXT RESULT
        // ------------------------------------------------

        searchIndex++;


        if (
          searchIndex >=
          searchResults.length
        ) {

          searchIndex = 0;

        }


      } catch (error) {

        console.error(
          "Error searching database:",
          error
        );


        alert(
          "Error searching database: " +
          error.message
        );

      }

    }
  );

}


// ======================================================
// UPDATE
// ======================================================

if (updateButton) {

  updateButton.addEventListener(
    "click",
    async () => {

      // ------------------------------------------------
      // NO SELECTED DATA
      // ------------------------------------------------

      if (!selectedDocumentId) {

        alert(
          "Please search for a word first."
        );

        return;
      }


      // ------------------------------------------------
      // GET VALUES
      // ------------------------------------------------

      const word =
        wordInput
          ? wordInput.value.trim()
          : "";


      const meaning =
        meaningInput
          ? meaningInput.value.trim()
          : "";


      const synonyms =
        synonymsInput
          ? synonymsInput.value.trim()
          : "";


      const language =
        languageSelect
          ? languageSelect.value
          : "";


      // ------------------------------------------------
      // REQUIRED
      // ------------------------------------------------

      if (!word || !meaning) {

        alert(
          "Please fill in WORD and MEANING."
        );

        return;
      }


      try {

        const wordDocument =
          doc(
            db,
            "words",
            selectedDocumentId
          );


        // ------------------------------------------------
        // UPDATE DATA
        // ------------------------------------------------

        await updateDoc(
          wordDocument,
          {

            word:
              word,

            meaning:
              meaning,

            synonyms:
              synonyms,

            language:
              language

          }
        );


        alert(
          "Data updated successfully!"
        );


        // Clear after update

        await clearForm();


      } catch (error) {

        console.error(
          "Error updating data:",
          error
        );


        alert(
          "Error updating data: " +
          error.message
        );

      }

    }
  );

}


// ======================================================
// DELETE
// ======================================================

if (deleteButton) {

  deleteButton.addEventListener(
    "click",
    async () => {

      // ------------------------------------------------
      // NO SELECTED DATA
      // ------------------------------------------------

      if (!selectedDocumentId) {

        alert(
          "Please search for a word first."
        );

        return;
      }


      // ------------------------------------------------
      // CONFIRM
      // ------------------------------------------------

      const confirmDelete =
        confirm(
          "Are you sure you want to delete this word?"
        );


      if (!confirmDelete) {
        return;
      }


      try {

        const wordDocument =
          doc(
            db,
            "words",
            selectedDocumentId
          );


        // ------------------------------------------------
        // DELETE
        // ------------------------------------------------

        await deleteDoc(
          wordDocument
        );


        alert(
          "Data deleted successfully!"
        );


        // Clear after delete

        await clearForm();


      } catch (error) {

        console.error(
          "Error deleting data:",
          error
        );


        alert(
          "Error deleting data: " +
          error.message
        );

      }

    }
  );

}


// ======================================================
// SHOW ALL DATA
// ======================================================

if (
  showDataButton &&
  dataTable
) {

  showDataButton.addEventListener(
    "click",
    async () => {

      try {

        // ----------------------------------------------
        // GET DATABASE
        // ----------------------------------------------

        const snapshot =
          await getDocs(
            collection(db, "words")
          );


        // ----------------------------------------------
        // CLEAR TABLE
        // ----------------------------------------------

        dataTable.innerHTML =
          "";


        // ----------------------------------------------
        // EMPTY DATABASE
        // ----------------------------------------------

        if (snapshot.empty) {

          alert(
            "There is no data in the database."
          );

          return;
        }


        // ----------------------------------------------
        // STORE DATA
        // ----------------------------------------------

        const rows = [];


        snapshot.forEach((firebaseDoc) => {

          rows.push(
            firebaseDoc.data()
          );

        });


        // ----------------------------------------------
        // SORT BY ID
        // ----------------------------------------------

        rows.sort(
          (a, b) =>
            Number(a.id) -
            Number(b.id)
        );


        // ----------------------------------------------
        // CREATE TABLE ROWS
        // ----------------------------------------------

        rows.forEach((data) => {

          const row =
            document.createElement("tr");


          const idCell =
            document.createElement("td");


          const wordCell =
            document.createElement("td");


          const meaningCell =
            document.createElement("td");


          const synonymsCell =
            document.createElement("td");


          const languageCell =
            document.createElement("td");


          // --------------------------------------------
          // VALUES
          // --------------------------------------------

          idCell.textContent =
            data.id ?? "-";


          wordCell.textContent =
            data.word ?? "-";


          meaningCell.textContent =
            data.meaning ?? "-";


          synonymsCell.textContent =
            data.synonyms ?? "-";


          languageCell.textContent =
            data.language ?? "-";


          // --------------------------------------------
          // APPEND CELLS
          // --------------------------------------------

          row.appendChild(
            idCell
          );


          row.appendChild(
            wordCell
          );


          row.appendChild(
            meaningCell
          );


          row.appendChild(
            synonymsCell
          );


          row.appendChild(
            languageCell
          );


          // --------------------------------------------
          // APPEND ROW
          // --------------------------------------------

          dataTable.appendChild(
            row
          );

        });


      } catch (error) {

        console.error(
          "Error loading data:",
          error
        );


        alert(
          "Error loading data: " +
          error.message
        );

      }

    }
  );

}
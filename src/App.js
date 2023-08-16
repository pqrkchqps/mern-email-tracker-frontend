import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import parse from "html-react-parser";
import "bootstrap/dist/css/bootstrap.min.css"; // Import Bootstrap CSS
import "./App.css";

const socket = io("/");

function App() {
  const [emails, setEmails] = useState([]);
  const [filteredEmails, setFilteredEmails] = useState([]);
  const [newEmail, setNewEmail] = useState({
    body: "",
    subject: "",
    date: "",
    to: [],
    from: [],
  });
  const [newTags, setNewTags] = useState([]);
  const [searchText, setSearchText] = useState("");

  const fetchEmails = () => {
    fetch("/emails")
      .then((response) => response.json())
      .then((data) => {
        setEmails(data);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  useEffect(() => {
    socket.on("newEmail", (email) => {
      console.log("newEmail", email);

      setEmails((prevEmails) =>
        removeDuplicates([...prevEmails, email], emailIdIsEqual)
      );
    });

    socket.on("ping", function () {
      console.log("ping recieved, sending pong");
      socket.emit("pong", { timestamp: new Date().getTime() });
    });

    fetchEmails();
  }, []);

  useEffect(() => {
    if (searchText === "") {
      setFilteredEmails([]);
    }
  }, [searchText]);

  const removeDuplicates = (items, conditionFunction) => {
    let uniqueItems = [];
    items.forEach((item) => {
      let unique = true;
      uniqueItems.forEach((uniqueItem) => {
        if (conditionFunction(uniqueItem, item)) {
          unique = false;
        }
      });
      if (unique) {
        uniqueItems.push(item);
      }
    });
    console.log(items, uniqueItems);
    return uniqueItems;
  };

  const emailIdIsEqual = (a, b) => {
    return a._id === b._id;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(value.split(","));
    if (name === "to" || name === "from") {
      setNewEmail({ ...newEmail, [name]: value.split(",") });
    } else {
      setNewEmail({ ...newEmail, [name]: value });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    fetch("/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newEmail),
    })
      .then((response) => response.json())
      .then((data) => {
        setEmails(
          (prevEmails) => removeDuplicates([...prevEmails, data]).emailIdIsEqual
        );
        setNewEmail({ body: "", subject: "", to: [], from: [], date: "" });
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  const handleSearch = (e) => {
    e.preventDefault();

    fetch(`/emails/search?searchText=${searchText}`)
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        setFilteredEmails(data);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  const handleTagChange = (e) => {
    const { name, value } = e.target;

    const copiedTags = [...newTags];
    copiedTags[name] = value;

    setNewTags(copiedTags);
  };

  const handleTagSubmit = (e, id) => {
    e.preventDefault();

    fetch(`/emails/${id}/tags`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tags: newTags[id] }),
    })
      .then((response) => response.json())
      .then((data) => {
        const updatedEmails = emails.map((email) => {
          if (email._id === id) {
            console.log("found", data.tags);
            return { ...email, tags: data.tags };
          }
          return email;
        });
        setEmails(updatedEmails);
        const copiedTags = [...newTags];
        copiedTags[id] = "";
        setNewTags(copiedTags);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  const handleFilterByTag = (e) => {
    e.preventDefault();
    const searchTag = e.target.name;
    fetch(`/emails/filter?tag=${searchTag}`)
      .then((response) => response.json())
      .then((data) => {
        setFilteredEmails(data);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  const handleDelete = (id) => {
    fetch(`/emails/${id}`, {
      method: "DELETE",
    })
      .then((response) => response.json())
      .then((data) => {
        const updatedEmails = emails.filter((email) => email._id !== id);
        setEmails(updatedEmails);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  console.log(emails);
  const getUniqueTagsFromEmails = (emails) => {
    const tags = [];
    emails.forEach((email) => {
      email.tags.forEach((tag) => {
        tags.push(tag);
      });
    });
    const uniqueTags = removeDuplicates(tags, (a, b) => a === b);
    return uniqueTags;
  };

  const renderedEmails = filteredEmails.length > 0 ? filteredEmails : emails;
  const uniqueTags = getUniqueTagsFromEmails(emails);

  return (
    <div className="container">
      <h1 className="my-4">Email Tracker</h1>
      <div className="form-controls">
        <form onSubmit={handleSubmit} className="my-4">
          <div className="form-group">
            <div className="form-group">
              <input
                type="text"
                name="to"
                placeholder="Email Addresses To"
                value={newEmail.to.join(",")}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                name="from"
                placeholder="Email Addresses From"
                value={newEmail.from.join(",")}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                name="date"
                placeholder="Date Sent"
                value={newEmail.date}
                onChange={handleChange}
              />
            </div>
            <input
              type="text"
              name="body"
              placeholder="Email Body"
              value={newEmail.body}
              onChange={handleChange}
            />
          </div>
          <button className="btn btn-primary" type="submit">
            Submit
          </button>
        </form>
        <form onSubmit={handleSearch} className="my-4">
          <div className="form-group">
            <input
              type="text"
              name="searchText"
              placeholder="Search by Text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" type="submit">
            Search
          </button>
        </form>
        <div className="my-4">
          <div className="form-group">
            {uniqueTags.map((tag) => (
              <button
                name={tag}
                className="btn btn-primary tag-button"
                onClick={handleFilterByTag}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
      <ul className="list-group">
        {renderedEmails.map((email) => (
          <li key={email._id} className="list-group-item">
            <ul className="list-group">
              <li className="list-group-item">To: {email.to.join(", ")}</li>
              <li className="list-group-item">From: {email.from.join(", ")}</li>
              <li className="list-group-item">Subject: {email.subject}</li>
              <li className="list-group-item">Date: {email.date}</li>
            </ul>
            <div>{parse(email.body ? email.body : "")}</div>
            <button
              className="btn btn-danger"
              onClick={() => handleDelete(email._id)}
            >
              Delete
            </button>
            <div>
              <p>Tags: {email.tags.join(", ")}</p>
              <form
                onSubmit={(e) => {
                  handleTagSubmit(e, email._id);
                }}
              >
                <input
                  type="text"
                  placeholder="New Tag"
                  value={newTags[email._id]}
                  name={email._id}
                  onChange={handleTagChange}
                />
                <button className="btn btn-primary" type="submit">
                  Add Tag
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;

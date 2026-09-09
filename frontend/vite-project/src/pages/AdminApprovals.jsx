import {
    useEffect,
    useState
} from "react";

import toast from
    "react-hot-toast";

import {
    CheckCircle,
    XCircle,
    Loader
} from "lucide-react";

import {
    api
} from "../services/api";

import {
    PageHeader
} from "../components/common/PageHeader";


export const AdminApprovals = () => {

    const [
        users,
        setUsers
    ] =
        useState([]);

    const [
        loading,
        setLoading
    ] =
        useState(true);


    const loadUsers =
        async () => {

            try {

                setLoading(true);

                const data =
                    await api
                        .getPendingUsers();

                setUsers(data);

            } catch (error) {

                toast.error(
                    error.message
                );

            } finally {

                setLoading(false);

            }

        };


    useEffect(() => {

        loadUsers();

    }, []);


    const approve =
        async (
            id
        ) => {

            try {

                await api.approveUser(
                    id
                );

                toast.success(
                    "User approved."
                );

                loadUsers();

            } catch (error) {

                toast.error(
                    error.message
                );

            }

        };


    const reject =
        async (
            id
        ) => {

            try {

                await api.rejectUser(
                    id
                );

                toast.success(
                    "User rejected."
                );

                loadUsers();

            } catch (error) {

                toast.error(
                    error.message
                );

            }

        };


    return (

        <div>

            <PageHeader

                title="Account Approvals"

                description="Review and approve Field Officer and Vehicle Operator registrations."

            />


            <div className="card">

                {loading ? (

                    <div
                        style={{
                            display:
                                "flex",
                            gap:
                                8,
                            alignItems:
                                "center"
                        }}
                    >

                        <Loader
                            size={18}
                        />

                        Loading requests...

                    </div>

                ) : users.length === 0 ? (

                    <div
                        style={{
                            color:
                                "var(--slate)",
                            padding:
                                20
                        }}
                    >
                        No pending registrations.
                    </div>

                ) : (

                    <div className="table-container">

                        <table>

                            <thead>

                                <tr>

                                    <th>
                                        User ID
                                    </th>

                                    <th>
                                        Name
                                    </th>

                                    <th>
                                        Role
                                    </th>

                                    <th>
                                        Email
                                    </th>

                                    <th>
                                        District
                                    </th>

                                    <th>
                                        Action
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {users.map(
                                    user =>
                                        (

                                            <tr
                                                key={
                                                    user._id
                                                }
                                            >

                                                <td
                                                    style={{
                                                        fontWeight:
                                                            700
                                                    }}
                                                >
                                                    {
                                                        user.userId
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        user.firstName
                                                    }{" "}
                                                    {
                                                        user.lastName
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        user.role
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        user.email
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        user.district ||
                                                        "—"
                                                    }
                                                </td>

                                                <td>

                                                    <div
                                                        style={{
                                                            display:
                                                                "flex",
                                                            gap:
                                                                8
                                                        }}
                                                    >

                                                        <button
                                                            className="btn btn-primary"
                                                            onClick={() =>
                                                                approve(
                                                                    user._id
                                                                )
                                                            }
                                                        >

                                                            <CheckCircle
                                                                size={14}
                                                            />

                                                            Approve

                                                        </button>


                                                        <button
                                                            className="btn btn-secondary"
                                                            onClick={() =>
                                                                reject(
                                                                    user._id
                                                                )
                                                            }
                                                        >

                                                            <XCircle
                                                                size={14}
                                                            />

                                                            Reject

                                                        </button>

                                                    </div>

                                                </td>

                                            </tr>

                                        )
                                )}

                            </tbody>

                        </table>

                    </div>

                )}

            </div>

        </div>

    );

};
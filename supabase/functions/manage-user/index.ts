import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey =
      Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader =
      req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized.",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // -----------------------------------------
    // Verify caller
    // -----------------------------------------

    const supabaseUser = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const {
      data: { user: caller },
      error: callerError,
    } = await supabaseUser.auth.getUser();

    if (callerError || !caller) {
      return new Response(
        JSON.stringify({
          error: "Invalid authentication session.",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // -----------------------------------------
    // Admin client
    // -----------------------------------------

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    // -----------------------------------------
    // Verify Owner
    // -----------------------------------------

    const {
      data: callerProfile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("role, is_active")
      .eq("id", caller.id)
      .single();

    if (
      profileError ||
      !callerProfile ||
      callerProfile.role !== "Owner" ||
      !callerProfile.is_active
    ) {
      return new Response(
        JSON.stringify({
          error: "Only an active Owner can manage users.",
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // -----------------------------------------
    // Request body
    // -----------------------------------------

    const body = await req.json();

    const action = body.action;
    const userId = String(body.userId ?? "").trim();

    if (!action || !userId) {
      return new Response(
        JSON.stringify({
          error: "Action and userId are required.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // -----------------------------------------
    // Prevent Owner from modifying himself
    // -----------------------------------------

    if (userId === caller.id) {
      return new Response(
        JSON.stringify({
          error:
            "The Owner cannot modify their own account from User Management.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // -----------------------------------------
    // EDIT USER
    // -----------------------------------------

    if (action === "update") {
      const name =
        String(body.name ?? "").trim();

      const role = body.role;

      if (!name || !role) {
        return new Response(
          JSON.stringify({
            error: "Name and role are required.",
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (
        !["Owner", "Rahul", "Accountant"].includes(role)
      ) {
        return new Response(
          JSON.stringify({
            error: "Invalid user role.",
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      const { data, error } =
        await supabaseAdmin
          .from("profiles")
          .update({
            name,
            role,
          })
          .eq("id", userId)
          .select()
          .single();

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          user: data,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

// -----------------------------------------
// ACTIVATE / DEACTIVATE
// -----------------------------------------

if (
  action === "toggle-active" ||
  action === "activate" ||
  action === "deactivate"
) {
  let isActive: boolean;

  // Preferred format:
  // { action: "toggle-active", isActive: true/false }

  if (action === "toggle-active") {
    if (typeof body.isActive !== "boolean") {
      return new Response(
        JSON.stringify({
          error: "isActive must be a boolean.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    isActive = body.isActive;
  }

  // Also support:
  // { action: "activate" }

  else if (action === "activate") {
    isActive = true;
  }

  // Also support:
  // { action: "deactivate" }

  else {
    isActive = false;
  }

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("profiles")
    .update({
      is_active: isActive,
    })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Toggle active error:", error);

    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      isActive,
      user: data,
    }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}

    // -----------------------------------------
    // RESET PASSWORD
    // -----------------------------------------

    if (action === "reset-password") {
      const password =
        String(body.password ?? "");

      if (password.length < 6) {
        return new Response(
          JSON.stringify({
            error:
              "Password must be at least 6 characters.",
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      const {
        data: updatedUser,
        error,
      } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          password,
        }
      );

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          user: {
            id: updatedUser.user.id,
            email: updatedUser.user.email,
          },
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: "Unknown action.",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
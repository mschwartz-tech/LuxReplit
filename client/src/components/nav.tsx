<Link
            to="/meal-plans"
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
              path === "/meal-plans" && "bg-muted text-primary"
            )}
          >
            <Utensils className="h-4 w-4" />
            Meal Plans
          </Link>
          <Link
            to="/workout-plans"
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
              path === "/workout-plans" && "bg-muted text-primary"
            )}
          >
            <Dumbbell className="h-4 w-4" />
            Workout Plans
          </Link>
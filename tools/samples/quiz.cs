using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace QuizApp
{
    public class User
    {
        public string Username { get; private set; }
        private string passwordHash;

        public User(string username, string passwordHash)
        {
            Username = username;
            this.passwordHash = passwordHash;
        }

        public bool CheckPassword(string attempt)
        {
            return Hash(attempt) == passwordHash;
        }

        public string ToFileLine()
        {
            return $"{Username},{passwordHash}";
        }

        public static string Hash(string text)
        {
            using (SHA256 sha = SHA256.Create())
            {
                byte[] bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(text));
                StringBuilder hex = new StringBuilder();
                foreach (byte b in bytes)
                {
                    hex.Append(b.ToString("x2"));
                }
                return hex.ToString();
            }
        }
    }

    public class UserManager
    {
        private const string UsersFile = "users.txt";
        private List<User> users = new List<User>();

        public UserManager()
        {
            Load();
        }

        private void Load()
        {
            if (!File.Exists(UsersFile)) return;
            try
            {
                foreach (string line in File.ReadAllLines(UsersFile))
                {
                    string[] parts = line.Split(',');
                    if (parts.Length == 2)
                    {
                        users.Add(new User(parts[0], parts[1]));
                    }
                }
            }
            catch (IOException)
            {
                Console.WriteLine("Warning: could not read the users file.");
            }
        }

        private void Save()
        {
            List<string> lines = new List<string>();
            foreach (User u in users)
            {
                lines.Add(u.ToFileLine());
            }
            File.WriteAllLines(UsersFile, lines);
        }

        public User FindUser(string username)
        {
            foreach (User u in users)
            {
                if (u.Username.ToLower() == username.ToLower())
                {
                    return u;
                }
            }
            return null;
        }

        public bool Register(string username, string password, out string message)
        {
            if (username.Length < 3 || username.Length > 15)
            {
                message = "Username must be 3 to 15 characters.";
                return false;
            }
            if (username.Contains(",") || username.Contains(" "))
            {
                message = "Username cannot contain commas or spaces.";
                return false;
            }
            if (FindUser(username) != null)
            {
                message = "That username is already taken.";
                return false;
            }
            if (!IsStrongPassword(password))
            {
                message = "Password needs 8+ characters, a capital letter and a digit.";
                return false;
            }

            users.Add(new User(username, User.Hash(password)));
            Save();
            message = "Account created. You can now log in.";
            return true;
        }

        public User Login(string username, string password)
        {
            User user = FindUser(username);
            if (user != null && user.CheckPassword(password))
            {
                return user;
            }
            return null;
        }

        private bool IsStrongPassword(string password)
        {
            bool hasUpper = false;
            bool hasDigit = false;
            foreach (char c in password)
            {
                if (char.IsUpper(c)) hasUpper = true;
                if (char.IsDigit(c)) hasDigit = true;
            }
            return password.Length >= 8 && hasUpper && hasDigit;
        }
    }

    public abstract class Question
    {
        public string Text { get; private set; }
        public int Points { get; private set; }

        protected Question(string text, int points)
        {
            Text = text;
            Points = points;
        }

        public abstract void Display();
        public abstract bool IsValidAnswer(string answer);
        public abstract bool CheckAnswer(string answer);
        public abstract string CorrectAnswerText();
    }

    public class MultipleChoiceQuestion : Question
    {
        private string[] options;
        private int correctIndex;

        public MultipleChoiceQuestion(string text, string[] options, int correctIndex, int points)
            : base(text, points)
        {
            this.options = options;
            this.correctIndex = correctIndex;
        }

        public override void Display()
        {
            Console.WriteLine(Text);
            for (int i = 0; i < options.Length; i++)
            {
                char letter = (char)('A' + i);
                Console.WriteLine($"   {letter}) {options[i]}");
            }
            char lastLetter = (char)('A' + options.Length - 1);
            Console.Write($"Your answer (A-{lastLetter}): ");
        }

        public override bool IsValidAnswer(string answer)
        {
            if (answer == null) return false;
            answer = answer.Trim().ToUpper();
            if (answer.Length != 1) return false;
            int index = answer[0] - 'A';
            return index >= 0 && index < options.Length;
        }

        public override bool CheckAnswer(string answer)
        {
            int index = answer.Trim().ToUpper()[0] - 'A';
            return index == correctIndex;
        }

        public override string CorrectAnswerText()
        {
            return $"{(char)('A' + correctIndex)}) {options[correctIndex]}";
        }
    }

    public class TrueFalseQuestion : Question
    {
        private bool correctAnswer;

        public TrueFalseQuestion(string text, bool correctAnswer, int points)
            : base(text, points)
        {
            this.correctAnswer = correctAnswer;
        }

        public override void Display()
        {
            Console.WriteLine(Text);
            Console.Write("True or false? (T/F): ");
        }

        public override bool IsValidAnswer(string answer)
        {
            if (answer == null) return false;
            answer = answer.Trim().ToUpper();
            return answer == "T" || answer == "F" || answer == "TRUE" || answer == "FALSE";
        }

        public override bool CheckAnswer(string answer)
        {
            bool saidTrue = answer.Trim().ToUpper().StartsWith("T");
            return saidTrue == correctAnswer;
        }

        public override string CorrectAnswerText()
        {
            return correctAnswer ? "True" : "False";
        }
    }

    public class Quiz
    {
        private List<Question> questions = new List<Question>();
        private Random random = new Random();

        public int QuestionCount
        {
            get { return questions.Count; }
        }

        public int TotalPoints
        {
            get
            {
                int total = 0;
                foreach (Question q in questions)
                {
                    total += q.Points;
                }
                return total;
            }
        }

        public void LoadFromFile(string fileName)
        {
            questions.Clear();
            if (!File.Exists(fileName))
            {
                File.WriteAllLines(fileName, DefaultQuestions());
            }

            foreach (string line in File.ReadAllLines(fileName))
            {
                if (line.Trim() == "" || line.StartsWith("#")) continue;
                try
                {
                    questions.Add(ParseQuestion(line));
                }
                catch (FormatException)
                {
                    Console.WriteLine($"Skipped a badly formatted line: {line}");
                }
                catch (IndexOutOfRangeException)
                {
                    Console.WriteLine($"Skipped a line with missing parts: {line}");
                }
            }
        }

        private Question ParseQuestion(string line)
        {
            string[] parts = line.Split('|');
            string type = parts[0].Trim().ToUpper();

            if (type == "MC")
            {
                string[] options = parts[2].Split(';');
                int correct = int.Parse(parts[3]);
                int points = int.Parse(parts[4]);
                if (correct < 0 || correct >= options.Length)
                {
                    throw new FormatException();
                }
                return new MultipleChoiceQuestion(parts[1], options, correct, points);
            }
            if (type == "TF")
            {
                bool correct = bool.Parse(parts[2]);
                int points = int.Parse(parts[3]);
                return new TrueFalseQuestion(parts[1], correct, points);
            }
            throw new FormatException();
        }

        private void Shuffle()
        {
            for (int i = questions.Count - 1; i > 0; i--)
            {
                int j = random.Next(i + 1);
                Question temp = questions[i];
                questions[i] = questions[j];
                questions[j] = temp;
            }
        }

        public int Run()
        {
            Shuffle();
            int score = 0;
            int number = 1;

            foreach (Question q in questions)
            {
                Console.WriteLine();
                Console.WriteLine($"Question {number} of {questions.Count} ({q.Points} point{(q.Points == 1 ? "" : "s")})");
                q.Display();

                string answer = Console.ReadLine();
                while (!q.IsValidAnswer(answer))
                {
                    Console.Write("That is not a valid answer. Try again: ");
                    answer = Console.ReadLine();
                }

                if (q.CheckAnswer(answer))
                {
                    Console.WriteLine("Correct!");
                    score += q.Points;
                }
                else
                {
                    Console.WriteLine($"Wrong. The answer was {q.CorrectAnswerText()}");
                }
                number++;
            }
            return score;
        }

        private static string[] DefaultQuestions()
        {
            return new string[]
            {
                "# MC|question|option;option;option;option|correct index from 0|points",
                "# TF|question|True or False|points",
                "MC|Which data type stores a whole number?|string;int;bool;double|1|1",
                "MC|What does Console.ReadLine() return?|int;char;string;bool|2|1",
                "TF|Array indexes in C# start at 1.|False|1",
                "TF|You cannot create an object from an abstract class.|True|2"
            };
        }
    }

    public class ScoreRecord
    {
        private const string DateFormat = "yyyy-MM-dd HH:mm";

        public string Username { get; private set; }
        public int Score { get; private set; }
        public int Total { get; private set; }
        public DateTime Date { get; private set; }

        public double Percentage
        {
            get
            {
                if (Total == 0) return 0;
                return (double)Score / Total * 100;
            }
        }

        public ScoreRecord(string username, int score, int total, DateTime date)
        {
            Username = username;
            Score = score;
            Total = total;
            Date = date;
        }

        public string ToFileLine()
        {
            return $"{Username},{Score},{Total},{Date.ToString(DateFormat, CultureInfo.InvariantCulture)}";
        }

        public static ScoreRecord FromFileLine(string line)
        {
            string[] parts = line.Split(',');
            return new ScoreRecord(
                parts[0],
                int.Parse(parts[1]),
                int.Parse(parts[2]),
                DateTime.ParseExact(parts[3], DateFormat, CultureInfo.InvariantCulture));
        }

        public override string ToString()
        {
            return $"{Date:dd/MM/yyyy HH:mm}  {Username,-15} {Score,3}/{Total,-3} {Percentage,5:F1}%";
        }
    }

    public class ScoreBoard
    {
        private const string ScoresFile = "scores.txt";

        public void Save(ScoreRecord record)
        {
            File.AppendAllText(ScoresFile, record.ToFileLine() + Environment.NewLine);
        }

        private List<ScoreRecord> LoadAll()
        {
            List<ScoreRecord> records = new List<ScoreRecord>();
            if (!File.Exists(ScoresFile)) return records;

            foreach (string line in File.ReadAllLines(ScoresFile))
            {
                try
                {
                    records.Add(ScoreRecord.FromFileLine(line));
                }
                catch (Exception)
                {
                    // a damaged line is skipped so the rest still load
                }
            }
            return records;
        }

        public void ShowForUser(string username)
        {
            Console.WriteLine($"\n--- Scores for {username} ---");
            int count = 0;
            foreach (ScoreRecord r in LoadAll())
            {
                if (r.Username.ToLower() == username.ToLower())
                {
                    Console.WriteLine(r);
                    count++;
                }
            }
            if (count == 0) Console.WriteLine("No quizzes taken yet.");
        }

        public void ShowLeaderboard(int howMany)
        {
            List<ScoreRecord> records = LoadAll();

            for (int pass = 0; pass < records.Count - 1; pass++)
            {
                for (int i = 0; i < records.Count - 1 - pass; i++)
                {
                    if (records[i].Percentage < records[i + 1].Percentage)
                    {
                        ScoreRecord temp = records[i];
                        records[i] = records[i + 1];
                        records[i + 1] = temp;
                    }
                }
            }

            Console.WriteLine($"\n--- Top {howMany} ---");
            if (records.Count == 0) Console.WriteLine("No scores yet.");
            for (int i = 0; i < records.Count && i < howMany; i++)
            {
                Console.WriteLine($"{i + 1}. {records[i]}");
            }
        }
    }

    class Program
    {
        private const string QuestionsFile = "questions.txt";
        private const int MaxLoginAttempts = 3;

        static UserManager userManager = new UserManager();
        static ScoreBoard scoreBoard = new ScoreBoard();

        static void Main(string[] args)
        {
            bool running = true;
            while (running)
            {
                Console.WriteLine();
                Console.WriteLine("==============================");
                Console.WriteLine("        C# QUIZ - MENU");
                Console.WriteLine("==============================");
                Console.WriteLine("1. Register");
                Console.WriteLine("2. Log in");
                Console.WriteLine("3. Exit");

                int choice = GetIntInRange("Choose an option: ", 1, 3);
                switch (choice)
                {
                    case 1:
                        RegisterScreen();
                        break;
                    case 2:
                        User user = LoginScreen();
                        if (user != null)
                        {
                            UserMenu(user);
                        }
                        break;
                    case 3:
                        running = false;
                        break;
                }
            }
            Console.WriteLine("Goodbye!");
        }

        static void RegisterScreen()
        {
            Console.WriteLine("\n--- Register ---");
            Console.Write("Choose a username: ");
            string username = (Console.ReadLine() ?? "").Trim();

            Console.Write("Choose a password: ");
            string password = ReadPassword();
            Console.Write("Confirm password: ");
            string confirm = ReadPassword();

            if (password != confirm)
            {
                Console.WriteLine("Passwords do not match. Please try again.");
                return;
            }

            userManager.Register(username, password, out string message);
            Console.WriteLine(message);
        }

        static User LoginScreen()
        {
            Console.WriteLine("\n--- Log in ---");
            for (int attempt = 1; attempt <= MaxLoginAttempts; attempt++)
            {
                Console.Write("Username: ");
                string username = (Console.ReadLine() ?? "").Trim();
                Console.Write("Password: ");
                string password = ReadPassword();

                User user = userManager.Login(username, password);
                if (user != null)
                {
                    Console.WriteLine($"Welcome back, {user.Username}!");
                    return user;
                }
                Console.WriteLine($"Incorrect username or password. {MaxLoginAttempts - attempt} attempt(s) left.");
            }
            Console.WriteLine("Too many failed attempts. Returning to the main menu.");
            return null;
        }

        static void UserMenu(User user)
        {
            bool loggedIn = true;
            while (loggedIn)
            {
                Console.WriteLine($"\n--- Logged in as {user.Username} ---");
                Console.WriteLine("1. Take the quiz");
                Console.WriteLine("2. My scores");
                Console.WriteLine("3. Leaderboard");
                Console.WriteLine("4. Log out");

                int choice = GetIntInRange("Choose an option: ", 1, 4);
                switch (choice)
                {
                    case 1:
                        TakeQuiz(user);
                        break;
                    case 2:
                        scoreBoard.ShowForUser(user.Username);
                        break;
                    case 3:
                        scoreBoard.ShowLeaderboard(5);
                        break;
                    case 4:
                        loggedIn = false;
                        Console.WriteLine("You have been logged out.");
                        break;
                }
            }
        }

        static void TakeQuiz(User user)
        {
            Quiz quiz = new Quiz();
            quiz.LoadFromFile(QuestionsFile);

            if (quiz.QuestionCount == 0)
            {
                Console.WriteLine("There are no questions to ask. Check questions.txt.");
                return;
            }

            Console.WriteLine($"\n{quiz.QuestionCount} questions, {quiz.TotalPoints} points available. Good luck, {user.Username}!");
            int score = quiz.Run();

            ScoreRecord record = new ScoreRecord(user.Username, score, quiz.TotalPoints, DateTime.Now);
            scoreBoard.Save(record);

            Console.WriteLine("\n==============================");
            Console.WriteLine($"You scored {score} out of {quiz.TotalPoints} ({record.Percentage:F1}%)");
            Console.WriteLine(GetFeedback(record.Percentage));
            Console.WriteLine("==============================");
        }

        static string GetFeedback(double percentage)
        {
            if (percentage >= 90) return "Outstanding - you really know your C#!";
            if (percentage >= 70) return "Great work - just a few to review.";
            if (percentage >= 50) return "A solid pass - revisit the parts you missed.";
            return "Keep practising - work back through the tutorial and try again.";
        }

        static int GetIntInRange(string prompt, int min, int max)
        {
            int value;
            Console.Write(prompt);
            while (!int.TryParse(Console.ReadLine(), out value) || value < min || value > max)
            {
                Console.Write($"Please enter a whole number from {min} to {max}: ");
            }
            return value;
        }

        static string ReadPassword()
        {
            string password = "";
            ConsoleKeyInfo key = Console.ReadKey(true);
            while (key.Key != ConsoleKey.Enter)
            {
                if (key.Key == ConsoleKey.Backspace)
                {
                    if (password.Length > 0)
                    {
                        password = password.Substring(0, password.Length - 1);
                        Console.Write("\b \b");
                    }
                }
                else if (!char.IsControl(key.KeyChar))
                {
                    password += key.KeyChar;
                    Console.Write("*");
                }
                key = Console.ReadKey(true);
            }
            Console.WriteLine();
            return password;
        }
    }
}

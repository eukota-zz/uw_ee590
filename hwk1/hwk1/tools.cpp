#include <vector>
#include <iostream>
#include <string>
#include "tools.h"
#include "CL\cl.h"

/* Tools written by me (Darrell Ross) for use in my code
 */

namespace tools
{
	float GetInput(const std::string& prompt)
	{
		std::cout << prompt;
		float v;
		std::cin >> v;
		return v;
	}

	// Prints out a list of the functions stored in the funcs vector with their descriptions
	// This is used when printing a "menu" of items to choose to run
	void PrintFuncs(const std::vector<FuncPtr>& funcs)
	{
		int funcNum = 0;
		for (std::vector<FuncPtr>::const_iterator i = funcs.begin(), e = funcs.end(); i != e; ++i, funcNum++)
		{
			std::cout << funcNum << ": " << i->description.c_str() << std::endl;
		}
	}

	std::vector<std::string> split(const std::string& str, const char* delim)
	{
		std::vector<std::string> v;
		if (str.empty())
			return v;

		size_t begin = 0;
		for (size_t i = 0; i <= str.size(); i++)
		{
			if (str[i] != *delim && i != str.size())
				continue;

			v.push_back(str.substr(begin, i - begin));
			begin = i + 1;
		}
		return v;
	}

	/*
	* Generate random value for input buffers
	*/
	void generateInputCL(cl_float* inputArray, cl_uint arrayWidth, cl_uint arrayHeight)
	{
		// random initialization of input
		size_t array_size = arrayWidth * arrayHeight;
		for (size_t i = 0; i < array_size; ++i)
		{
			inputArray[i] = (cl_float)(rand() % 100); // mod to fix possible floating point comparison issues found during office hours with Logan
		}
	}

	void generateInputCMatrix(float arr[1024][1024])
	{
		for (size_t i = 0; i < 1024; i++)
		{
			for (size_t j = 0; j < 1024; j++)
			{
				arr[i][j] = (float)(rand() % 100);
			}
		}

	}

	void generateInputC(float* inputArray, size_t arrayWidth, size_t arrayHeight)
	{
		// random initialization of input
		size_t array_size = arrayWidth * arrayHeight;
		for (size_t i = 0; i < array_size; ++i)
		{
			inputArray[i] = (float)(rand() % 100); // mod to fix possible floating point comparison issues found during office hours with Logan
		}
	}

	// fill STL matrix with random numbers
	void generateInputSTL(std::vector<float>* inputMatrix)
	{
		if (!inputMatrix || inputMatrix->empty())
			throw "invalid input";

		const size_t mSize = inputMatrix->size();
		for (size_t i = 0; i < mSize; i++)
		{
			(*inputMatrix)[i] = (float)(rand() % 100);
		}
	}

	bool verifyEqual(const std::vector<float>& pA, const std::vector<float>& pB)
	{
		if (pA.size() != pB.size())
			return false;
		if (pA.empty() && pB.empty())
			return true;

		const size_t mSize = pA.size();
		for (size_t i = 0; i < mSize; i++)
		{
			if (pA[i] != pB[i])
				return false;
		}
		return true;
	}


} // end namespace tools